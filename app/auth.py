# Import dataclass để đóng gói thông tin người dùng sau xác thực
from dataclasses import dataclass
# Import datetime/timedelta/timezone để tính toán hạn sử dụng token theo UTC
from datetime import datetime, timedelta, timezone
# Import Annotated và Optional cho kiểu dữ liệu linh hoạt trong dependency FastAPI
from typing import Annotated, Optional

# Import PyJWT để encode/decode JSON Web Token
import jwt
# Import Depends/HTTPException/Security/status để xây dựng dependency và phản hồi lỗi HTTP
from fastapi import Depends, HTTPException, Security, status
# Import OAuth2PasswordBearer để đọc header Authorization: Bearer theo chuẩn OAuth2
from fastapi.security import OAuth2PasswordBearer
# Import CryptContext để băm/kiểm tra mật khẩu với bcrypt
from passlib.context import CryptContext
# Import select/update để truy vấn và cập nhật dữ liệu bằng SQLAlchemy ORM
from sqlalchemy import select, update
# Import Session để làm việc với phiên kết nối cơ sở dữ liệu
from sqlalchemy.orm import Session

# Import settings để lấy các biến cấu hình JWT từ môi trường
from app.config import settings
# Import Base/get_db/get_engine để thao tác schema và quản lý session
from app.database import Base, get_db, get_engine
# Import model AuthToken/AuthUser đại diện cho bảng xác thực
from app.models_auth import AuthToken, AuthUser

# Khởi tạo context bcrypt để băm/verify mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Thiết lập OAuth2PasswordBearer giúp FastAPI đọc bearer token từ header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
# Cờ đánh dấu đã khởi tạo schema auth chưa (tránh chạy nhiều lần)
_schema_initialized = False


# Định nghĩa ngoại lệ nội bộ cho các lỗi xác thực token
class AuthError(Exception):
    # Docstring mô tả rõ mục đích ngoại lệ tự định nghĩa
    """Nội bộ: dùng khi validate thông tin xác thực thất bại."""


# Dataclass chứa thông tin người dùng đã xác thực để dùng trong route
@dataclass
class AuthContext:
    # ID của user trong bảng auth_users (dạng số nguyên)
    user_id: int
    # Username phục vụ ghi log và hiển thị
    username: str
    # Chuỗi jti (UUID) đại diện cho token hiện tại
    token_jti: str


# Hàm đảm bảo schema auth_users và auth_tokens được tạo trong DB
def _ensure_schema() -> None:
    # Sử dụng biến toàn cục để kiểm soát trạng thái khởi tạo
    global _schema_initialized
    # Nếu đã khởi tạo trước đó thì không cần làm lại
    if _schema_initialized:
        return
    # Lấy engine kết nối cơ sở dữ liệu (tự khởi tạo khi cần)
    engine = get_engine()
    # Tạo các bảng auth nếu chưa tồn tại
    Base.metadata.create_all(bind=engine, checkfirst=True)
    # Ghi nhận việc khởi tạo để lần sau bỏ qua
    _schema_initialized = True


# Hàm băm mật khẩu plain-text bằng bcrypt
def hash_password(password: str) -> str:
    # Trả về chuỗi hash dùng để lưu xuống cơ sở dữ liệu
    return pwd_context.hash(password)


# Hàm kiểm tra mật khẩu người dùng nhập vào với hash lưu trong DB
def verify_password(password: str, password_hash: str) -> bool:
    # Sử dụng passlib để xác thực mật khẩu có khớp hay không
    return pwd_context.verify(password, password_hash)


# Hàm đăng nhập: xác thực username/password và trả về đối tượng user nếu hợp lệ
def authenticate_user(db: Session, username: str, password: str) -> Optional[AuthUser]:
    # Đảm bảo schema auth đã được khởi tạo
    _ensure_schema()
    # Viết câu truy vấn tìm user theo username
    stmt = select(AuthUser).where(AuthUser.username == username)
    # Thực thi truy vấn và lấy bản ghi (nếu tồn tại)
    user = db.execute(stmt).scalar_one_or_none()
    # Nếu không có user hoặc user đã bị vô hiệu hóa thì trả về None
    if not user or not user.is_active:
        return None
    # Nếu mật khẩu không khớp với hash thì trả về None
    if not verify_password(password, user.password_hash):
        return None
    # Nếu mọi thứ hợp lệ thì trả về đối tượng người dùng
    return user


# Hàm tạo payload chuẩn cho JWT access token
def _jwt_payload(user_id: int, jti: str, expires_at: datetime) -> dict:
    # Trả về dictionary chứa các claim quan trọng
    return {
        "sub": str(user_id),  # Claim sub là ID người dùng dạng chuỗi
        "jti": jti,  # Claim jti lưu UUID để truy vết và thu hồi
        "exp": expires_at,  # Claim exp xác định thời điểm token hết hạn
        "iat": datetime.now(tz=timezone.utc),  # Claim iat ghi nhận thời điểm phát hành
        "type": "access",  # Claim type giúp phân biệt token access/refresh (nếu có)
    }


# Hàm phát hành JWT mới và lưu thông tin token xuống DB
def issue_token(db: Session, user: AuthUser) -> str:
    # Kiểm tra khóa bí mật đã cấu hình chưa, nếu thiếu thì báo lỗi 500
    if not settings.JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY chưa được cấu hình.",
        )
    # Tính thời lượng sống của token dựa trên cấu hình phút
    lifetime = timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    # Xác định thời điểm hết hạn bằng cách cộng lifetime với thời gian hiện tại
    expires_at = datetime.now(tz=timezone.utc) + lifetime
    # Sinh chuỗi jti ngẫu nhiên để lưu xuống DB
    token_jti = AuthToken.new_jti()
    # Gộp payload JWT từ thông tin user và jti
    payload = _jwt_payload(user.id, token_jti, expires_at)
    # Encode payload thành chuỗi JWT ký bằng secret key
    encoded = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    # Tạo đối tượng AuthToken để ghi vào cơ sở dữ liệu
    db_token = AuthToken(
        token_jti=token_jti,
        user_id=user.id,
        expires_at=expires_at,
    )
    # Thêm record token vào session
    db.add(db_token)
    # Ghi thay đổi xuống DB để token có hiệu lực
    db.commit()
    # Trả về chuỗi JWT cho client
    return encoded


# Hàm đọc JWT gửi lên và đối chiếu với bản ghi lưu trong DB
def _load_token_record(db: Session, token: str) -> AuthToken:
    # Kiểm tra secret key đã cấu hình, nếu thiếu thì raise AuthError
    if not settings.JWT_SECRET_KEY:
        raise AuthError("Chưa cấu hình JWT_SECRET_KEY.")
    try:
        # Giải mã token bằng secret và thuật toán đã định
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        # Nếu token quá hạn thì ném lỗi tương ứng
        raise AuthError("Token đã hết hạn.") from exc
    except jwt.PyJWTError as exc:
        # Nếu token sai định dạng hoặc chữ ký không hợp lệ
        raise AuthError("Token không hợp lệ.") from exc
    # Lấy claim sub đại diện cho user_id
    sub = payload.get("sub")
    # Lấy claim jti để đối chiếu với bảng auth_tokens
    jti = payload.get("jti")
    # Nếu thiếu một trong các claim quan trọng thì xem như token rỗng
    if not sub or not jti:
        raise AuthError("Token thiếu thông tin bắt buộc.")
    # Viết câu truy vấn lấy bản ghi token theo jti
    stmt = select(AuthToken).where(AuthToken.token_jti == jti)
    # Thực thi truy vấn và lấy bản ghi (nếu có)
    db_token = db.execute(stmt).scalar_one_or_none()
    # Nếu không tìm thấy thì token có thể đã bị thu hồi
    if db_token is None:
        raise AuthError("Token không tồn tại hoặc đã bị thu hồi.")
    # Kiểm tra token có thuộc về đúng user hay không
    if db_token.user_id != int(sub):
        raise AuthError("Token không khớp người dùng.")
    # Nếu token đã bị thu hồi thì trả lỗi
    if db_token.revoked_at is not None:
        raise AuthError("Token đã bị thu hồi.")
    # Kiểm tra hạn sử dụng ở DB để chắc chắn token chưa hết hạn
    if db_token.expires_at < datetime.now(tz=timezone.utc):
        raise AuthError("Token đã hết hạn.")
    # Trả về bản ghi token hợp lệ để các dependency sử dụng
    return db_token


# Dependency FastAPI đọc bearer token và trả về bản ghi AuthToken
def get_current_auth_token(
    bearer_token: str = Depends(oauth2_scheme),  # Lấy token từ header Authorization
    db: Session = Depends(get_db),  # Nhận session DB cho request hiện tại
) -> AuthToken:
    # Đảm bảo schema tồn tại trước khi truy vấn
    _ensure_schema()
    try:
        # Tải bản ghi token tương ứng từ DB
        token = _load_token_record(db, bearer_token)
    except AuthError as exc:
        # Nếu có lỗi xác thực thì chuyển thành HTTP 401 cho client
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    # Trả về bản ghi token để route có thể dùng tiếp
    return token


# Dependency buộc người dùng phải còn hoạt động và trả về AuthContext gọn nhẹ
def require_active_user(token: AuthToken = Depends(get_current_auth_token)) -> AuthContext:
    # Lấy user gắn với token
    user = token.user
    # Nếu không tìm thấy user (trường hợp dữ liệu lỗi) thì báo 500
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không truy xuất được thông tin người dùng.",
        )
    # Nếu user đã bị vô hiệu hóa thì trả về 403
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa.",
        )
    # Nếu hợp lệ thì trả về AuthContext chứa thông tin cần thiết
    return AuthContext(user_id=user.id, username=user.username, token_jti=token.token_jti)


# Hàm thu hồi token bằng cách set revoked_at trong DB
def revoke_token(db: Session, token_jti: str) -> None:
    # Viết câu lệnh UPDATE để đánh dấu token đã bị thu hồi (nếu chưa)
    stmt = (
        update(AuthToken)
        .where(AuthToken.token_jti == token_jti, AuthToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(tz=timezone.utc))
    )
    # Thực thi câu lệnh cập nhật
    db.execute(stmt)
    # Commit thay đổi để đảm bảo trạng thái được lưu lại
    db.commit()


# Dependency tùy chọn: chỉ trả về AuthContext khi header Bearer hợp lệ
def optional_active_user(
    authorization: Optional[str] = Security(oauth2_scheme_optional),  # Nhận token Bearer nếu đã login
    db: Session = Depends(get_db),  # Nhận session DB cho việc kiểm tra token
) -> Optional[AuthContext]:
    # Nếu không có token thì coi như người dùng chưa đăng nhập
    if not authorization:
        return None
    try:
        # Kiểm tra token và lấy bản ghi tương ứng từ DB
        db_token = _load_token_record(db, authorization)
    except AuthError as exc:
        # Nếu token không hợp lệ thì trả về lỗi 401 cho client
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    # Lấy user từ bản ghi token để kiểm tra trạng thái hoạt động
    user = db_token.user
    # Nếu user không tồn tại hoặc bị khóa thì trả lỗi 403
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa.",
        )
    # Trả về AuthContext cho trường hợp header hợp lệ
    return AuthContext(user_id=user.id, username=user.username, token_jti=db_token.token_jti)

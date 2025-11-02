from pinotdb import connect  # Import hàm connect của pinotdb để tạo kết nối tới Pinot

# Kết nối đến broker (8099)
conn = connect(host='93.115.172.151', port=8099, path='/query/sql', scheme='http')  # Tạo connection tới Pinot broker qua REST SQL
cursor = conn.cursor()  # Sinh cursor DB-API để chạy truy vấn

cursor.execute("SELECT 1")  # Thực thi truy vấn lấy 5 dòng đầu của bảng myTable
for row in cursor:  # Lặp qua từng dòng kết quả trả về
    print(row)  # In ra nội dung từng dòng

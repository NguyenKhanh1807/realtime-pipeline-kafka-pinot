-- Create transaction_users table to store user data for transaction generation
CREATE TABLE IF NOT EXISTS transaction_users (
    id SERIAL PRIMARY KEY,
    user_seq INTEGER UNIQUE NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    id_type VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    register_date DATE NOT NULL,
    first_transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_seq for faster lookups
CREATE INDEX IF NOT EXISTS idx_transaction_users_user_seq ON transaction_users(user_seq);

-- Insert 300 random users
INSERT INTO transaction_users (user_seq, user_name, country_code, id_type, birth_date, register_date, first_transaction_date)
SELECT 
    1000000 + gs AS user_seq,
    CASE (random() * 300)::int % 300
        WHEN 0 THEN 'James Smith' WHEN 1 THEN 'Mary Johnson' WHEN 2 THEN 'Robert Williams'
        WHEN 3 THEN 'Patricia Brown' WHEN 4 THEN 'John Jones' WHEN 5 THEN 'Jennifer Garcia'
        WHEN 6 THEN 'Michael Miller' WHEN 7 THEN 'Linda Davis' WHEN 8 THEN 'David Rodriguez'
        WHEN 9 THEN 'Barbara Martinez' WHEN 10 THEN 'William Hernandez' WHEN 11 THEN 'Elizabeth Lopez'
        WHEN 12 THEN 'Richard Gonzalez' WHEN 13 THEN 'Susan Wilson' WHEN 14 THEN 'Joseph Anderson'
        WHEN 15 THEN 'Jessica Thomas' WHEN 16 THEN 'Thomas Taylor' WHEN 17 THEN 'Sarah Moore'
        WHEN 18 THEN 'Charles Jackson' WHEN 19 THEN 'Karen Martin' WHEN 20 THEN 'Christopher Lee'
        WHEN 21 THEN 'Nancy Perez' WHEN 22 THEN 'Daniel Thompson' WHEN 23 THEN 'Lisa White'
        WHEN 24 THEN 'Matthew Harris' WHEN 25 THEN 'Betty Sanchez' WHEN 26 THEN 'Anthony Clark'
        WHEN 27 THEN 'Margaret Ramirez' WHEN 28 THEN 'Mark Lewis' WHEN 29 THEN 'Sandra Robinson'
        WHEN 30 THEN 'Donald Walker' WHEN 31 THEN 'Ashley Young' WHEN 32 THEN 'Steven Allen'
        WHEN 33 THEN 'Kimberly King' WHEN 34 THEN 'Paul Wright' WHEN 35 THEN 'Emily Scott'
        WHEN 36 THEN 'Andrew Torres' WHEN 37 THEN 'Donna Nguyen' WHEN 38 THEN 'Joshua Hill'
        WHEN 39 THEN 'Michelle Flores' WHEN 40 THEN 'Kenneth Green' WHEN 41 THEN 'Carol Adams'
        WHEN 42 THEN 'Kevin Nelson' WHEN 43 THEN 'Amanda Baker' WHEN 44 THEN 'Brian Hall'
        WHEN 45 THEN 'Melissa Rivera' WHEN 46 THEN 'George Campbell' WHEN 47 THEN 'Deborah Mitchell'
        WHEN 48 THEN 'Edward Carter' WHEN 49 THEN 'Stephanie Roberts' WHEN 50 THEN 'Ronald Gomez'
        WHEN 51 THEN 'Rebecca Phillips' WHEN 52 THEN 'Timothy Evans' WHEN 53 THEN 'Laura Turner'
        WHEN 54 THEN 'Jason Diaz' WHEN 55 THEN 'Sharon Parker' WHEN 56 THEN 'Jeffrey Cruz'
        WHEN 57 THEN 'Cynthia Edwards' WHEN 58 THEN 'Ryan Collins' WHEN 59 THEN 'Kathleen Reyes'
        WHEN 60 THEN 'Jacob Stewart' WHEN 61 THEN 'Amy Morris' WHEN 62 THEN 'Gary Morales'
        WHEN 63 THEN 'Angela Murphy' WHEN 64 THEN 'Nicholas Cook' WHEN 65 THEN 'Shirley Rogers'
        WHEN 66 THEN 'Eric Gutierrez' WHEN 67 THEN 'Helen Ortiz' WHEN 68 THEN 'Jonathan Morgan'
        WHEN 69 THEN 'Anna Cooper' WHEN 70 THEN 'Stephen Peterson' WHEN 71 THEN 'Brenda Bailey'
        WHEN 72 THEN 'Larry Reed' WHEN 73 THEN 'Pamela Kelly' WHEN 74 THEN 'Justin Howard'
        WHEN 75 THEN 'Emma Ramos' WHEN 76 THEN 'Scott Ward' WHEN 77 THEN 'Nicole Cox'
        WHEN 78 THEN 'Brandon Richardson' WHEN 79 THEN 'Katherine Wood' WHEN 80 THEN 'Benjamin Brooks'
        WHEN 81 THEN 'Christine Chavez' WHEN 82 THEN 'Samuel Russell' WHEN 83 THEN 'Samantha Hughes'
        WHEN 84 THEN 'Gregory Price' WHEN 85 THEN 'Debra Bennett' WHEN 86 THEN 'Frank Myers'
        WHEN 87 THEN 'Rachel Long' WHEN 88 THEN 'Raymond Foster' WHEN 89 THEN 'Carolyn Sanders'
        WHEN 90 THEN 'Alexander Jenkins' WHEN 91 THEN 'Janet Perry' WHEN 92 THEN 'Patrick Powell'
        WHEN 93 THEN 'Catherine Patterson' WHEN 94 THEN 'Jack Hughes' WHEN 95 THEN 'Maria Alexander'
        WHEN 96 THEN 'Dennis Griffin' WHEN 97 THEN 'Heather Hayes' WHEN 98 THEN 'Jerry Butler'
        WHEN 99 THEN 'Diane Barnes' WHEN 100 THEN 'Tyler Fisher' WHEN 101 THEN 'Julie Henderson'
        WHEN 102 THEN 'Aaron Coleman' WHEN 103 THEN 'Joyce Jenkins' WHEN 104 THEN 'Jose Simmons'
        WHEN 105 THEN 'Victoria Patterson' WHEN 106 THEN 'Adam Jordan' WHEN 107 THEN 'Frances Reynolds'
        WHEN 108 THEN 'Nathan Hamilton' WHEN 109 THEN 'Gloria Graham' WHEN 110 THEN 'Zachary Kim'
        WHEN 111 THEN 'Teresa Gonzales' WHEN 112 THEN 'Kyle Castillo' WHEN 113 THEN 'Sara Pierce'
        WHEN 114 THEN 'Harold Ford' WHEN 115 THEN 'Janice Warren' WHEN 116 THEN 'Carl Stone'
        WHEN 117 THEN 'Cheryl Hale' WHEN 118 THEN 'Arthur Webb' WHEN 119 THEN 'Megan Tucker'
        WHEN 120 THEN 'Roger Day' WHEN 121 THEN 'Evelyn Cole' WHEN 122 THEN 'Keith Fields'
        WHEN 123 THEN 'Martha Francis' WHEN 124 THEN 'Jeremy Lane' WHEN 125 THEN 'Judy Austin'
        WHEN 126 THEN 'Terry Rice' WHEN 127 THEN 'Theresa Myers' WHEN 128 THEN 'Lawrence Chapman'
        WHEN 129 THEN 'Beverly Hunt' WHEN 130 THEN 'Sean Ferguson' WHEN 131 THEN 'Denise Hanson'
        WHEN 132 THEN 'Austin Holmes' WHEN 133 THEN 'Tammy Mason' WHEN 134 THEN 'Christian Boyd'
        WHEN 135 THEN 'Marie Knight' WHEN 136 THEN 'Noah Ford' WHEN 137 THEN 'Alexis Sullivan'
        WHEN 138 THEN 'Ethan Wells' WHEN 139 THEN 'Kathryn Arnold' WHEN 140 THEN 'Logan Wheeler'
        WHEN 141 THEN 'Doris Barrett' WHEN 142 THEN 'Joe Vasquez' WHEN 143 THEN 'Alice Watts'
        WHEN 144 THEN 'Bryan Curry' WHEN 145 THEN 'Julia Dawson' WHEN 146 THEN 'Billy Dean'
        WHEN 147 THEN 'Andrea Mendez' WHEN 148 THEN 'Jordan Banks' WHEN 149 THEN 'Jacqueline Meyer'
        WHEN 150 THEN 'Albert Black' WHEN 151 THEN 'Hannah Wallace' WHEN 152 THEN 'Dylan Rose'
        WHEN 153 THEN 'Grace Spencer' WHEN 154 THEN 'Bruce Lawson' WHEN 155 THEN 'Sophia Hart'
        WHEN 156 THEN 'Willie Hudson' WHEN 157 THEN 'Olivia Fleming' WHEN 158 THEN 'Gabriel Grant'
        WHEN 159 THEN 'Madison Pearson' WHEN 160 THEN 'Alan Quinn' WHEN 161 THEN 'Ava Higgins'
        WHEN 162 THEN 'Juan Vaughn' WHEN 163 THEN 'Ella Preston' WHEN 164 THEN 'Louis Marsh'
        WHEN 165 THEN 'Abigail Delgado' WHEN 166 THEN 'Russell Howell' WHEN 167 THEN 'Mia Barker'
        WHEN 168 THEN 'Randy Robbins' WHEN 169 THEN 'Chloe Berry' WHEN 170 THEN 'Vincent Hodges'
        WHEN 171 THEN 'Natalie Sharp' WHEN 172 THEN 'Philip Benson' WHEN 173 THEN 'Lily Palmer'
        WHEN 174 THEN 'Bobby Malone' WHEN 175 THEN 'Ella Roy' WHEN 176 THEN 'Johnny Douglas'
        WHEN 177 THEN 'Zoe Norton' WHEN 178 THEN 'Bradley Gross' WHEN 179 THEN 'Lillian Zimmerman'
        WHEN 180 THEN 'Wayne Bryan' WHEN 181 THEN 'Addison Gibbs' WHEN 182 THEN 'Jesse Chapman'
        WHEN 183 THEN 'Leah Watts' WHEN 184 THEN 'Henry Bryan' WHEN 185 THEN 'Avery Walters'
        WHEN 186 THEN 'Walter Tyler' WHEN 187 THEN 'Sofia Harper' WHEN 188 THEN 'Ralph Rhodes'
        WHEN 189 THEN 'Scarlett Wade' WHEN 190 THEN 'Roy Crane' WHEN 191 THEN 'Aria Cross'
        WHEN 192 THEN 'Eugene Shelton' WHEN 193 THEN 'Aurora Fowler' WHEN 194 THEN 'Russell Reid'
        WHEN 195 THEN 'Ellie Walton' WHEN 196 THEN 'Arthur Mann' WHEN 197 THEN 'Brooklyn Rios'
        WHEN 198 THEN 'Howard Ortega' WHEN 199 THEN 'Penelope Lyons' WHEN 200 THEN 'Peter Stokes'
        WHEN 201 THEN 'Hazel Lamb' WHEN 202 THEN 'Shawn Bowen' WHEN 203 THEN 'Violet Olson'
        WHEN 204 THEN 'Jack Parsons' WHEN 205 THEN 'Luna Gregory' WHEN 206 THEN 'Ernest Moss'
        WHEN 207 THEN 'Nora Fitzgerald' WHEN 208 THEN 'Carlos Lucas' WHEN 209 THEN 'Eleanor Parks'
        WHEN 210 THEN 'Antonio Munoz' WHEN 211 THEN 'Stella Castro' WHEN 212 THEN 'Jeremy Shaw'
        WHEN 213 THEN 'Paisley Freeman' WHEN 214 THEN 'Fred Welch' WHEN 215 THEN 'Skylar Burke'
        WHEN 216 THEN 'Victor Mcdonald' WHEN 217 THEN 'Claire Simon' WHEN 218 THEN 'Martin Frank'
        WHEN 219 THEN 'Bella Curtis' WHEN 220 THEN 'Craig Garrett' WHEN 221 THEN 'Lucy Walton'
        WHEN 222 THEN 'Phillip Hogan' WHEN 223 THEN 'Piper Pearson' WHEN 224 THEN 'Joel Chandler'
        WHEN 225 THEN 'Genesis Manning' WHEN 226 THEN 'Stanley Gill' WHEN 227 THEN 'Kennedy Park'
        WHEN 228 THEN 'Edwin Reese' WHEN 229 THEN 'Kinsley Graves' WHEN 230 THEN 'Rodney Hicks'
        WHEN 231 THEN 'Naomi Williamson' WHEN 232 THEN 'Curtis Carr' WHEN 233 THEN 'Sadie Neal'
        WHEN 234 THEN 'Allen Bates' WHEN 235 THEN 'Madelyn Massey' WHEN 236 THEN 'Marcus Goodwin'
        WHEN 237 THEN 'Isabelle Floyd' WHEN 238 THEN 'Norman Jimenez' WHEN 239 THEN 'Willow Mckenzie'
        WHEN 240 THEN 'Francis Roman' WHEN 241 THEN 'Emilia Mayo' WHEN 242 THEN 'Edgar Strickland'
        WHEN 243 THEN 'Valentina Nixon' WHEN 244 THEN 'Tom Mcgee' WHEN 245 THEN 'Athena Garrett'
        WHEN 246 THEN 'Jim Koch' WHEN 247 THEN 'Nova Larson' WHEN 248 THEN 'Calvin Daniels'
        WHEN 249 THEN 'Emery Schneider' WHEN 250 THEN 'Chester Glenn' WHEN 251 THEN 'Iris Nichols'
        WHEN 252 THEN 'Evan Casey' WHEN 253 THEN 'Ivy Farmer' WHEN 254 THEN 'Dave Manning'
        WHEN 255 THEN 'Ruby Ferguson' WHEN 256 THEN 'Mike Norris' WHEN 257 THEN 'Elena Hardy'
        WHEN 258 THEN 'Jeff Cannon' WHEN 259 THEN 'Jade Tucker' WHEN 260 THEN 'Steve Garrett'
        WHEN 261 THEN 'Melody Boyle' WHEN 262 THEN 'Tony Stokes' WHEN 263 THEN 'Faith Maldonado'
        WHEN 264 THEN 'Luis Drake' WHEN 265 THEN 'Rose Sutton' WHEN 266 THEN 'Lewis Hampton'
        WHEN 267 THEN 'Josephine Drake' WHEN 268 THEN 'Milton Holloway' WHEN 269 THEN 'Aaliyah Horton'
        WHEN 270 THEN 'Floyd Ramsey' WHEN 271 THEN 'Eliana Weaver' WHEN 272 THEN 'Leonard Cohen'
        WHEN 273 THEN 'Gianna Simon' WHEN 274 THEN 'Brad Harmon' WHEN 275 THEN 'Serenity Ware'
        WHEN 276 THEN 'Dale Newton' WHEN 277 THEN 'Raelynn Nixon' WHEN 278 THEN 'Harvey Howell'
        WHEN 279 THEN 'Layla Leonard' WHEN 280 THEN 'Dustin West' WHEN 281 THEN 'Reagan Francis'
        WHEN 282 THEN 'Don Schultz' WHEN 283 THEN 'Everly Benson' WHEN 284 THEN 'Eddie Moran'
        WHEN 285 THEN 'Lydia Ramsey' WHEN 286 THEN 'Gerald Patrick' WHEN 287 THEN 'Eloise Garrett'
        WHEN 288 THEN 'Jay Townsend' WHEN 289 THEN 'Brielle Webster' WHEN 290 THEN 'Gene Sandoval'
        WHEN 291 THEN 'Kaylee Rich' WHEN 292 THEN 'Jessie Moody' WHEN 293 THEN 'Ariana Bass'
        WHEN 294 THEN 'Leo Craig' WHEN 295 THEN 'Emersyn Savage' WHEN 296 THEN 'Hugh Singleton'
        WHEN 297 THEN 'Mariah York' WHEN 298 THEN 'Felix Boone' WHEN 299 THEN 'Adalynn Joseph'
    END AS user_name,
    CASE (random() * 4)::int % 4
        WHEN 0 THEN 'VN' WHEN 1 THEN 'KR' WHEN 2 THEN 'JP' ELSE 'SG'
    END AS country_code,
    CASE (random() * 3)::int % 3
        WHEN 0 THEN 'ID' WHEN 1 THEN 'PASSPORT' ELSE 'DL'
    END AS id_type,
    DATE '1960-01-01' + (random() * 16436)::int AS birth_date,
    DATE '2000-01-01' + (random() * 9131)::int AS register_date,
    DATE '2000-01-01' + (random() * 9131)::int AS first_transaction_date
FROM generate_series(1, 300) AS gs
ON CONFLICT (user_seq) DO NOTHING;

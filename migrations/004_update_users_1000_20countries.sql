-- Drop existing users and recreate with 1000 users from 20 different countries
TRUNCATE TABLE transaction_users;

-- Reset the sequence
ALTER SEQUENCE transaction_users_id_seq RESTART WITH 1;

-- Insert 1000 users from 20 different countries
INSERT INTO transaction_users (user_seq, user_name, country_code, id_type, birth_date, register_date, first_transaction_date)
SELECT 
    1000000 + gs AS user_seq,
    -- Generate random names using a larger pool
    CASE (random() * 1000)::int % 100
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
        WHEN 99 THEN 'Diane Barnes' ELSE 'User ' || (gs % 1000)::text
    END AS user_name,
    -- Distribute across 20 countries
    CASE (random() * 20)::int % 20
        WHEN 0 THEN 'US'  -- United States
        WHEN 1 THEN 'GB'  -- United Kingdom
        WHEN 2 THEN 'VN'  -- Vietnam
        WHEN 3 THEN 'JP'  -- Japan
        WHEN 4 THEN 'KR'  -- South Korea
        WHEN 5 THEN 'SG'  -- Singapore
        WHEN 6 THEN 'CN'  -- China
        WHEN 7 THEN 'IN'  -- India
        WHEN 8 THEN 'AU'  -- Australia
        WHEN 9 THEN 'CA'  -- Canada
        WHEN 10 THEN 'DE' -- Germany
        WHEN 11 THEN 'FR' -- France
        WHEN 12 THEN 'IT' -- Italy
        WHEN 13 THEN 'ES' -- Spain
        WHEN 14 THEN 'BR' -- Brazil
        WHEN 15 THEN 'MX' -- Mexico
        WHEN 16 THEN 'TH' -- Thailand
        WHEN 17 THEN 'ID' -- Indonesia
        WHEN 18 THEN 'MY' -- Malaysia
        ELSE 'PH'         -- Philippines
    END AS country_code,
    CASE (random() * 3)::int % 3
        WHEN 0 THEN 'ID' WHEN 1 THEN 'PASSPORT' ELSE 'DL'
    END AS id_type,
    DATE '1960-01-01' + (random() * 23000)::int AS birth_date,
    DATE '2000-01-01' + (random() * 9131)::int AS register_date,
    DATE '2000-01-01' + (random() * 9131)::int AS first_transaction_date
FROM generate_series(1, 1000) AS gs
ON CONFLICT (user_seq) DO NOTHING;

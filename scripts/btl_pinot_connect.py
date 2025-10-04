from pinotdb import connect

# Kết nối đến broker (8099)
conn = connect(host='93.115.172.151', port=8099, path='/query/sql', scheme='http')
cursor = conn.cursor()

cursor.execute("SELECT * FROM myTable LIMIT 5")
for row in cursor:
    print(row)

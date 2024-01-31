//var conn = require(rootDir + "/config/dbConfig");
exports.sample = async (req, res) => {
    //res.json("hello world");
    const sql = `insert into todoitem (description, done) values(:1, :2)`;
    const rows = [ ["Task 1", 0 ], ["Task 2", 0 ], ["Task 3", 1 ], ["Task 4", 0 ], ["Task 5", 1 ] ];
    let result = await connection.executeMany(sql, rows);
    console.log(result.rowsAffected, "Rows Inserted");
    connection.commit()
}//
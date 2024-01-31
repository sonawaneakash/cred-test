var dbConn = require('../../config/dbConfig.js');
const { validationResult } = require('express-validator');

// Create API
exports.postCheckDetails = async (req, res) => {
    const connection = await dbConn();
    const body = req.body;
    // console.log("body=====", JSON.stringify(body));
    if (!body.chequenumber || !body.chequedate || !body.payeename || !body.bankname || !body.bankcode || !body.amount || !body.amount_in_words || !body.emailaddress) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            msg: error.msg,
            value: error.value
        }));
        return res.status(400).json({ errors: formattedErrors });
    }
    const sql = `
        INSERT INTO cheque_book_ak 
        (cheque_number, cheque_date, payee_name, bank_name, bank_code, amount, amount_in_words, email_address) 
        VALUES (:1, TO_DATE(:2, 'YYYY-MM-DD'), :3, :4, :5, :6, :7, :8,'N')
    `;

    const values = [
        body.chequenumber,
        body.chequedate,
        body.payeename,
        body.bankname,
        body.bankcode,
        body.amount,
        body.amount_in_words,
        body.emailaddress
    ];

    try {
        const result = await connection.execute(sql, values);
        console.log(result.rowsAffected, "Row(s) Inserted");
        connection.commit();
        res.json("Data inserted successfully");
    } catch (error) {
        console.error("Error inserting data:", error.message);
        connection.rollback();
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        connection.release();
    }
};

// Update API
exports.updateCheckDetails = async (req, res) => {
    const connection = await dbConn();
    const body = req.body;
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            msg: error.msg,
            value: error.value
        }));
        return res.status(400).json({ errors: formattedErrors });
    }

    const updateFields = [];
    const values = [];

    if (body.payeename) {
        updateFields.push('payee_name = :payeename');
        values.push(body.payeename);
    }

    if (body.emailaddress) {
        updateFields.push('email_address = :emailaddress');
        values.push(body.emailaddress);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ error: "No valid fields to update." });
    }

    const sql = `
        UPDATE cheque_book_ak
        SET ${updateFields.join(', ')}
        WHERE cheque_number = :cheque_number
    `;

    values.push(body.cheque_number);

    try {
        const result = await connection.execute(sql, values);
        console.log(result.rowsAffected, "Row(s) Updated");
        connection.commit();
        res.json("Data updated successfully");
    } catch (error) {
        console.error("Error updating data:", error.message);
        connection.rollback();
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        connection.release();
    }
};

// Authorize record API
exports.authorizeRecord = async (req, res) => {
    const connection = await dbConn();
    const checkNum = req.body.cheque_number;

    const sql = `
        UPDATE cheque_book_ak
        SET authorized = 'Y'
        WHERE cheque_number = :checkNum
    `;

    try {
        const result = await connection.execute(sql, [checkNum]);
        console.log(result.rowsAffected, "Record(s) Authorized");
        connection.commit();
        res.json("Record authorized successfully");
    } catch (error) {
        console.error("Error authorizing record:", error);
        connection.rollback();
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        connection.release();
    }
};

// Unauthorize record API
exports.deauthorizeRecord = async (req, res) => {
    const connection = await dbConn();
    const checkNum = req.body.cheque_number;

    const sql = `
        UPDATE cheque_book_ak
        SET authorized = 'N'
        WHERE cheque_number = :checkNum
    `;

    try {
        const result = await connection.execute(sql, [checkNum]);
        console.log(result.rowsAffected, "Record(s) Deauthorized");
        connection.commit();
        res.json("Record deauthorized successfully");
    } catch (error) {
        console.error("Error deauthorizing record:", error);
        connection.rollback();
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        connection.release();
    }
};

// Print action API
exports.logPrintAction = async (req, res) => {
    const connection = await dbConn();
    const chequenumber = req.body.cheque_number;
    const printedby = req.body.printedby;
    console.log(JSON.stringify(req.body))
    // Check if the cheque has been previously printed
    const checkDuplicateSql = `
        SELECT COUNT(*) AS count
        FROM cheque_log_ak
        WHERE chequenumber = :1
    `;

    //Update the duplicate column if the cheque has been previously printed
    const updateDuplicateSql = `
        UPDATE cheque_log_ak
        SET duplicate = 'Y'
        WHERE chequenumber = :1
    `;

    // Insert a new record if the cheque is not a duplicate
    const insertSql = `
        INSERT INTO cheque_log_ak
            (chequenumber, printedon, printedby,duplicate)
        VALUES (:1, SYSDATE, :2, 'N')
    `;

    try {
        // Check if the cheque has been previously printed
        const binds1=[chequenumber]
        const checkResult = await connection.execute(checkDuplicateSql, binds1);
        console.log("checkResult.rows[0].COUNT",JSON.stringify(checkResult))
        const isDuplicate = checkResult.rows[0].length > 0;
        console.log("==",isDuplicate)
        if (isDuplicate) {
            // Update the duplicate column if the cheque has been previously printed
            const binds=[chequenumber]
            await connection.execute(updateDuplicateSql, binds);
            console.log("Cheque marked as duplicate");
        } else {
            // Insert a new record if the cheque is not a duplicate
            const binds=[chequenumber,printedby]
            await connection.execute(insertSql, binds);
            console.log("Print action logged");
        }

        connection.commit();
        res.json("Print action logged successfully");
    } catch (error) {
        console.error("Error logging print action:", error.message);
        connection.rollback();
        res.status(500).json({ error: "Failed to log print action" });
    } finally {
        connection.release();
    }
};

const dbConn = require('../../config/dbConfig.js');
const sendNotification = require('./notification.js');

// Create API
exports.postChequeDetails = async (req, res) => {
    const connection = await dbConn();
    const body = req.body;
    // console.log("body=====", JSON.stringify(body));
    req.checkBody('chequenumber', 'Please enter cheque number').notEmpty().isNumeric();
    req.checkBody('emailaddress', 'Please enter a valid email').notEmpty().isEmail();
    req.checkBody('payeename', 'Please enter payeename').notEmpty();
    req.checkBody('chequedate','Please enter cheque date').notEmpty().isISO8601();
    req.checkBody('bankname','Please enter bank name').notEmpty(),
    req.checkBody('bankcode','Please enter bank code').notEmpty(),
    req.checkBody('amount','Please enter amount').notEmpty().isNumeric(),
    req.checkBody('amount_in_words','Please enter amount in words').notEmpty();
    
    const sql = `INSERT INTO cheque_book_ak (cheque_number, cheque_date, payee_name, bank_name, bank_code, amount, amount_in_words, email_address,created_by,authorized) VALUES (:1, TO_DATE(:2, 'YYYY-MM-DD'), :3, :4, :5, :6, :7, :8, :9,'N')`;

    var userId = await getUserId(req.headers.sessionid);
    //console.log("userId===",userId)
    const values = [
        body.chequenumber,
        body.chequedate,
        body.payeename,
        body.bankname,
        body.bankcode,
        body.amount,
        body.amount_in_words,
        body.emailaddress,
        userId
    ];

    try {
        const result = await connection.execute(sql, values);
        console.log(result.rowsAffected, "Row's Inserted");
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
exports.updateChequeDetails = async (req, res) => {
    const connection = await dbConn();
    const body = req.body;
    
    req.checkBody('payeename').optional();
    req.checkBody('emailaddress').optional().isEmail();

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

    const sql = `UPDATE cheque_book_ak SET ${updateFields.join(', ')} WHERE cheque_number = :cheque_number`;
    values.push(body.cheque_number);

    try {
        const result = await connection.execute(sql, values);
        console.log(result.rowsAffected, "Row's Updated");
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

    const updateSql = `UPDATE cheque_book_ak SET auth_by = :1, authorized = 'Y' WHERE cheque_number = :2`;

    try {
        var userId = await getUserId(req.headers.sessionid);
        const selectSql =`SELECT created_by FROM cheque_book_ak WHERE cheque_number =:1`;
        const selectResult = await connection.execute(selectSql, [checkNum]);
        //console.log('selectResult',JSON.stringify(selectResult));
        if (selectResult.rows[0][0] === userId) {
            return res.json({ message: "Created user and authorize user are the same, please use a different user." });
        }
          
        const result = await connection.execute(updateSql, [userId,checkNum]);
        console.log(result.rowsAffected, "Record(s) Authorized");
        if(result.rowsAffected>0) {
            var createdBy = selectResult.rows[0][0];
            var message = `Record authorized successfully to ${checkNum} by ${userId}`;
            sendNotification(createdBy, message,'authorized'); 
        }
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

    const sql = `UPDATE cheque_book_ak SET auth_by = :1, authorized = 'N' WHERE cheque_number = :2`;

    try {
        var userId = await getUserId(req.headers.sessionid);
        const selectSql =`SELECT created_by FROM cheque_book_ak WHERE cheque_number =:1`;
        const selectResult = await connection.execute(selectSql, [checkNum]);
        //console.log('selectResult',JSON.stringify(selectResult));
        if (selectResult.rows[0][0] === userId) {
            return res.json({ message: "Created user and authorize user are the same, please use a different user." });
        }
        const result = await connection.execute(sql, [userId,checkNum]);
        console.log(result.rowsAffected, "Record(s) Deauthorized");
        if(result.rowsAffected>0) {
            var createdBy = selectResult.rows[0][0];
            var message = `Record deauthorized successfully to ${checkNum} by ${userId}`;
            sendNotification(createdBy, message,'deauthorized'); 
        }
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
    const printedby = await getUserId(req.headers.sessionid);;

    // Check if the cheque has been previously printed
    const checkDuplicateSql = `SELECT COUNT(*) AS count FROM cheque_log_ak WHERE chequenumber = :1`;

    //Update the duplicate column if the cheque has been previously printed
    const updateDuplicateSql = `UPDATE cheque_log_ak SET duplicate = 'Y' WHERE chequenumber = :1`;

    // Insert a new record if the cheque is not a duplicate
    const insertSql = `INSERT INTO cheque_log_ak (chequenumber, printedon, printedby, duplicate) VALUES (:1, SYSDATE, :2, 'N')`;
    
    try {
        // Check if the cheque has been previously printed
        const chkData=[chequenumber]
        const checkResult = await connection.execute(checkDuplicateSql, chkData);
        console.log("checkResult.rows[0].COUNT",JSON.stringify(checkResult))
        const isDuplicate = checkResult.rows[0][0].length > 0;
        
        if (isDuplicate) {
            // Update the duplicate column if the cheque has been previously printed
            const upData=[chequenumber]
            await connection.execute(updateDuplicateSql, upData);
            console.log("Cheque marked as duplicate");
        } else {
            // Insert a new record if the cheque is not a duplicate
            console.log("print=======",chequenumber,printedby)
            const insData=[chequenumber,printedby]
            var result = await connection.execute(insertSql, insData);
            console.log("Print action logged");
            if(result.rowsAffected>0) {
                const selectSql = `SELECT auth_by FROM cheque_book_ak WHERE cheque_number = :1`;
                var result = await connection.execute(selectSql, [chequenumber]);
                var authBy = result.rows[0][0];
                var message = `Cheque is printed to ${chequenumber} by ${printedby}`;
                sendNotification(authBy, message,'cheque_print'); 
            }
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

async function getUserId(session_id) {
    const connection = await dbConn();
    const oracleUserQry = `SELECT USER_ID, USER_NAME, SESSIONID FROM iwz_user_master WHERE sessionid = :1 AND active = 'Y' AND login_flag = 'Y'`;
    const sessionid = [session_id];
    const checkResult = await connection.execute(oracleUserQry, sessionid);
    connection.release();
    return checkResult.rows[0][0];
}

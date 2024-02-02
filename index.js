express = require('express');
app = express();
const port = 8080;
router = express.Router(); 
bodyParser = require('body-parser');

const expressValidator = require('express-validator');
path = require("path");
rootDir = __dirname;
app.use(bodyParser.json());
app.use(expressValidator());
const dbConn = require('./config/dbConfig.js');

async function sessionIdVerification(req, res, next) {
    try {
      const connection = await dbConn();
      const oracleUserQry = `SELECT USER_ID, USER_NAME, SESSIONID FROM iwz_user_master WHERE sessionid = :1 AND active = 'Y' AND login_flag = 'Y'`;
      const sessionId = [req.headers.sessionid];
      const checkResult = await connection.execute(oracleUserQry, sessionId);
      //console.log("checkResult==",JSON.stringify(checkResult));

      if (checkResult && checkResult.rows && checkResult.rows.length > 0) {
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized access' });
      }
    } catch (error) {
      console.error('Error in session verification:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
}
  
app.use(sessionIdVerification); 
app.use('/', require('./app/routes/routes.js'));
app.listen(port, console.log(`server is running on port ${port}`));
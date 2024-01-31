const oracle = require('oracledb');

async function run() {
  let connection = await oracle.getConnection({
    user : 'mfx_training',
    password : 'mfx_training',
    connectionString : 'mercuryfx.chwkrfaqj9m1.ap-south-1.rds.amazonaws.com:1521/orcl',
  })
    console.log('Oracle Db Successfully connected');
    return connection;
}

module.exports = run;
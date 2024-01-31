const mainController = require('../controllers/controller.js');
const { body } = require('express-validator');
var validationArr = [
    body('chequenumber').notEmpty().isNumeric(),
    body('chequedate').notEmpty().isISO8601(),
    body('payeename').notEmpty(),
    body('bankname').notEmpty(),
    body('bankcode').notEmpty(),
    body('amount').notEmpty().isNumeric(),
    body('amount_in_words').notEmpty(),
    body('emailaddress').notEmpty().isEmail()
];
var updateValidation = [
    body('payeename').optional(),
    body('emailaddress').optional().isEmail()
]
router.post('/create',validationArr, mainController.postCheckDetails);
router.post('/update', updateValidation, mainController.updateCheckDetails);
router.post('/authorize', mainController.authorizeRecord);
router.post('/deauthorize', mainController.deauthorizeRecord);
router.post('/print', mainController.logPrintAction);

module.exports = router;
const mainController = require('../controllers/controller.js');

router.post('/create', mainController.postChequeDetails);
router.post('/update', mainController.updateChequeDetails);
router.post('/authorize', mainController.authorizeRecord);
router.post('/deauthorize', mainController.deauthorizeRecord);
router.post('/print', mainController.logPrintAction);

module.exports = router;
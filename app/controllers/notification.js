const amqp = require('amqplib');

function sendNotification (userId, message,queue_name) {
  const queue = queue_name;

  amqp.connect('amqp://localhost')
    .then((connection) => connection.createChannel())
    .then((channel) => {
      return channel.assertQueue(queue).then(() => {
        const notification = { userId, message };
        const messageBuffer = Buffer.from(JSON.stringify(notification));

        channel.sendToQueue(queue, messageBuffer, { persistent: true });
        console.log(`Notification sent to user ${userId}`);
      });
    })
    .catch((error) => {
      console.error('Error sending notification:', error);
    });
};

module.exports = sendNotification;
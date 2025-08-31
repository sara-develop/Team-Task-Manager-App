// mq/consumer.js
import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const queueName = 'task_notifications';

const startConsumer = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(queueName, { durable: true });

        console.log(`Waiting for messages in queue: ${queueName}`);

        channel.consume(queueName, msg => {
            if (msg !== null) {
                const content = msg.content.toString();
                console.log('Received message:', content);
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('Failed to start RabbitMQ consumer:', err.message);
    }
};

startConsumer();

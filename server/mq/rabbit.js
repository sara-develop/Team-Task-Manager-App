// mq/rabbit.js
import amqp from 'amqplib';

let channel;

export const initRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('task_notifications', { durable: true });
    console.log('Connected to RabbitMQ');
    return channel;
  } catch (err) {
    console.error('RabbitMQ connection failed:', err.message);
    return null;
  }
};

export const getRabbitChannel = () => channel;

import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI as string);
		console.log('MongoDB connected');
	} catch (error) {
		console.error('MongoDB connection error:', error);
		process.exit(1);
	}
};

export default connectDB;

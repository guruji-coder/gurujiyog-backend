import mongoose from 'mongoose';

// Production-ready database connection with retry logic
export const connectDB = async (retries = 5): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gurujiyog';
  const isProduction = process.env.NODE_ENV === 'production';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Attempting MongoDB connection (attempt ${attempt}/${retries})`);
      
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: isProduction ? 10000 : 5000,
        socketTimeoutMS: isProduction ? 45000 : 30000,
        maxPoolSize: isProduction ? 10 : 5,
        retryWrites: true,
        retryReads: true,
      });
      
      console.log('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB disconnected');
        if (isProduction) {
          // Attempt to reconnect in production
          setTimeout(() => connectDB(3), 5000);
        }
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
      });
      
      return; // Success, exit the retry loop
      
    } catch (error: any) {
      console.error(`❌ MongoDB connection failed (attempt ${attempt}/${retries}):`, error);
      
      if (error?.message?.includes('IP') && error?.message?.includes('whitelist')) {
        console.log('🔧 IP whitelist issue detected. Attempting to update...');
        
        if (isProduction && process.env.ATLAS_PUBLIC_KEY) {
          try {
            const { exec } = require('child_process');
            await new Promise((resolve, reject) => {
              exec('./update-atlas-ip.sh', (error: any, stdout: string, stderr: string) => {
                if (error) reject(error);
                else {
                  console.log(stdout);
                  resolve(stdout);
                }
              });
            });
            console.log('✅ Atlas IP whitelist updated, retrying connection...');
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for propagation
          } catch (updateError) {
            console.error('❌ Failed to update Atlas IP whitelist:', updateError);
          }
        } else {
          console.log('ℹ️  Manual action required: Update Atlas IP whitelist');
          console.log('   Current IP can be found by running: curl https://ipinfo.io/ip');
        }
      }
      
      if (attempt === retries) {
        console.error('❌ All connection attempts failed. Exiting...');
        if (isProduction) {
          process.exit(1); // Exit in production
        } else {
          throw error; // Throw in development for debugging
        }
      }
      
      // Wait before next attempt (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}; 
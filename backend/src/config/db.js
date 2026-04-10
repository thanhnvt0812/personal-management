import prisma from "../config/prisma.js";

export async function checkDBConnection() {
    try {
        await prisma.$connect();

        // query test
        const result = await prisma.$queryRaw`SELECT 1`;

        console.log("✅ Database connected:", result);
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
}
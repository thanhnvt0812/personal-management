import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import { checkDBConnection } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRouter from "./src/routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 8080;


app.use(express.json());
app.use(cookieParser())


await checkDBConnection();
//middleware handle CORS
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

//API endpoints
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

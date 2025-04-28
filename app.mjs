import "dotenv/config";
import express from "express";
import cors from "cors";
import postRouter from "./routes/postRouter.mjs";
import authRouter from "./routes/auth.mjs";

const app = express();
const port = process.env.PORT || 4001;

const allowedOrigins = [
  process.env.CLIENT_URL,
 'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('Request Origin:', origin);
    console.log('Allowed CLIENT_URL:', process.env.CLIENT_URL);
    console.log('Is Origin Allowed?', !origin || allowedOrigins.includes(origin));
  
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cors());
app.use(express.json());

app.use("/posts", postRouter)
app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.send("Hello TechUp!");
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});

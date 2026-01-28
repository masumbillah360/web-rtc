import express from "express"
import cors from 'cors'

const app = express()
app.use(cors({ origin: "*"}))
app.use(express.json());


app.get('/', (req, res) => {
    return res.json({
        success: true,
        message: "Server up and running..."
    })
})

export default app;
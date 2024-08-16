const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 9000

const app = express()

const corsOptions = {
    origin: ['http://localhost:5173'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

// QuzF4C4rpMRSBpCR
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0dpphli.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const assignmentCollection = client.db('onlineGroupStudy').collection('assignments')

        // get all assignment data from db
        app.get('/assignments', async (req, res) => {
            // const email = req.params.email
            // const query = { 'buyer.email': email }
            const result = await assignmentCollection.find().toArray()
            res.send(result)
        })

        // create assignment in db 
        app.post('/assignment', async (req, res) => {
            const assignmentData = req.body;
            const result = await assignmentCollection.insertOne(assignmentData)
            res.send(result)
        })

        // delete an assignment in db
        app.delete('/assignments/:id', async(req, res) =>{
            const id =req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await assignmentCollection.deleteOne(query)
            res.send(result);
        })


        // update a assignment in db
        // app.put('/updateAssignment/:_id', async (req, res) => {
        //     const id = req.params._id
        //     const updateAssignment = req.body
        //     const query = { _id: new ObjectId(id) }
        //     const options = { upsert: true }
        //     const updateDoc = {
        //         $set: {
        //             imageUrl: assignmentData.imageUrl, title: assignmentData.title, description: assignmentData.description,
        //             marks: assignmentData.marks, difficulty: assignmentData.difficulty, dueDate: assignmentData.dueDate,
        //             email: assignmentData.email
        //         },
        //     }
        //     const result = await assignmentCollection.updateOne(query, updateDoc, options)
        //     res.send(result)
        // })

        // app.get('/singleAssignment/:_id', async (req, res) => {
        //     const id = (req.params._id);
        //     const result = await assignmentCollection.findOne({ _id: new ObjectId(id)});
        //     // console.log(result);
        //     res.send(result);
        // })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from online group study.....')
})

app.listen(port, () => console.log(`server running on port ${port}`))
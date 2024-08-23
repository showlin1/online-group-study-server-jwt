const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 9000

const app = express()
// middleware
const corsOptions = {
    origin: ['http://localhost:5173',
        'https://online-group-study-25c87.web.app',
        'https://online-group-study-25c87.firebaseapp.com'
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json());
app.use(cookieParser());

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

// middlewares
const logger = (req, res, next) => {
    console.log('log:info', req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    // no token available
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}

const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const assignmentCollection = client.db('onlineGroupStudy').collection('assignments')
        const myAssignmentCollection = client.db('onlineGroupStudy').collection('myAssignments')
        const giveMarkCollection = client.db('onlineGroupStudy').collection('giveMark')
        // auth related api
        // jwt generate
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d',
            })
            res.cookie('token', token, cookieOption)
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { ...cookieOption, maxAge: 0 }).send({ success: true })
        })

        // services related api
        // get all assignment data from db
        app.get('/assignments', async (req, res) => {
            const result = await assignmentCollection.find().toArray()
            res.send(result)
        })

        // get a single assignment data from db using assignment id
        app.get('/assignment/:id', async (req, res) => {
            const id = (req.params.id);
            const result = await assignmentCollection.findOne({ _id: new ObjectId(id) });
            // console.log(result);
            res.send(result);
        })


        // create assignment in db 
        app.post('/assignment', async (req, res) => {
            const assignmentData = req.body;
            const result = await assignmentCollection.insertOne(assignmentData)
            res.send(result)
        })

        // delete an assignment in db
        app.delete('/assignments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await assignmentCollection.deleteOne(query)
            res.send(result);
        })


        app.get('/assignments/:id', async (req, res) => {
            const id = (req.params.id);
            const result = await assignmentCollection.findOne({ _id: new ObjectId(id) });
            // console.log(result);
            res.send(result);
        })

        // update a assignment in db
        app.put('/assignments/:id', async (req, res) => {
            const id = req.params.id
            const updateAssignment = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const assignment = {
                $set: {
                    imageUrl: updateAssignment.imageUrl, title: updateAssignment.title, description: updateAssignment.description,
                    marks: updateAssignment.marks, difficulty: updateAssignment.difficulty, dueDate: updateAssignment.dueDate,
                    email: updateAssignment.email
                },
            }
            const result = await assignmentCollection.updateOne(query, assignment, options)
            res.send(result)
        })

        // get all assignment data from db for pagination
        app.get('/all-assignments', async (req, res) => {
            const size = parseInt(req.query.size) || 3;
            const page = parseInt(req.query.page) - 1;
            const { filter } = req.query;
            const sort = req.query.sort;
            console.log(size, page)
            let query = {}
            if (filter) {
                query = { difficulty: filter };
            }
            let options = { sort: { dueDate: sort === 'asc' ? 1 : -1 } }
            const result = await assignmentCollection.find(query, options).skip(page * size).limit(size).toArray()
            res.send(result)
        })

        // get all assignment data count from db
        app.get('/assignment-count', async (req, res) => {
            const filter = req.query.filter || 0;
            let query = {}
            if (filter) query = { difficulty: filter }
            const count = await assignmentCollection.countDocuments(query)
            res.send({ count })
        })


        // my Assignments

        // save a my Assignment data in db
        app.post('/myAssignments', async (req, res) => {
            const myAssignmentData = req.body;
            //check if its a duplicate request
            const query = {
                email: myAssignmentData.email,
                assignmentId: myAssignmentData.assignmentId,
            }
            const alreadyApplied = await myAssignmentCollection.findOne(query)
            // console.log(alreadyApplied);
            if (alreadyApplied) {
                return res
                    .status(400)
                    .send('You have already placed a takeAssignment on this assignment.')
            }
            const result = await myAssignmentCollection.insertOne(myAssignmentData)
            res.send(result);
        })

        // get all myAssignments for a user by email from db
        app.get('/myAssignments/:email', logger, verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await myAssignmentCollection.find(query).toArray()
            res.send(result)
        })
        // get all myAssignments requests from db for assignment owner
        app.get('/assignmentRequest/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { 'othersUser.email': email }
            const result = await myAssignmentCollection.find(query).toArray()
            res.send(result)
        })


        // Update my assignment status
        app.patch('/myAssignment/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: status,
            }
            const result = await myAssignmentCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        // delete a assignment data from db
        app.delete('/myAssignment/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await myAssignmentCollection.deleteOne(query)
            res.send(result)
        })



        // giveMark

        app.get('/giveMarks', async (req, res) => {
            const cursor = giveMarkCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/giveMarks', async (req, res) => {
            const giveMark = req.body
            const result = await giveMarkCollection.insertOne(giveMark)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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
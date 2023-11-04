const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors(
  {
    origin:[
      // 'http://localhost:5173'
      'https://simple-firebase-26194.web.app',
      'https://simple-firebase-26194.firebaseapp.com',
      'https://simple-firebase-26194.web.app'
    ],
    credentials: true
  }
));
app.use(express.json());
app.use(cookieParser());

// selfmade middleware
const verifyToken = async(req,res,next) =>{
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message:'unAuthorized'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err,decoded) => {
    if(err){
      return  res.status(401).send({message:'unAuthorized'})
    }

    // console.log('value in token', decoded)
   
    req.user = decoded;
    next();

  })

}


console.log(process.env.DB_USER)
console.log(process.env.DB_PASS)

// const uri = "mongodb+srv://<username>:<password>@cluster0.cuu4rc1.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cuu4rc1.mongodb.net/?retryWrites=true&w=majority`;

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

   const serviceCollection = client.db('carDoctor').collection('services');
   const bookingCollection = client.db('carDoctor').collection('bookings');

  //  to generate token using jwt FOR SIGN IN 
  app.post('/jwt', async(req,res) =>{
    const user = req.body;
    console.log(user);
    const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRETE,{expiresIn:'1h'});
    console.log(token)
    res
    .cookie('token', token, {
      httpOnly: true,
      // secure: false,
      // sameSite: 'none'
    })
    .send({success:true})
    console.log(user)
  })

  // TO CHECK WHICH USER LOGGED OUT

  app.post('/logout', async(req, res) =>{
      const user = req.body;
      console.log('LOGGESD OUT USER')

      // to clear logged users cookie while logging out
       res.clearCookie('token', {maxAge:0}).send({success:true})
  })
    //  to make a link for bookings according to a specific email wala user

    app.get('/bookings', verifyToken, async(req, res) =>{

        // checking if the users token match with its actual owner or not
        if(req.query.email !== req.user.email){
          return  res.status(401).send({message:'unAuthorized'})
        }
  

      let query = {};
      
  
      if(req.query?.email){
        query = {email: req.query.email}
      }

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
      console.log('tokennnn' ,req.cookies.token)
    })

  

    // to get services from mongodb
   app.get('/services', async(req,res) =>{
    const cursor = serviceCollection.find();
    const result = await cursor.toArray();
    res.send(result);
   })
    // to get a single data according to id route
     app.get('/services/:id', async(req,res) =>{
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const options = {
            projection: { title: 1, price: 1, service_id: 1, email: 1, img: 1 },
            
          };
        const result = await serviceCollection.findOne(query , options);
        res.send(result)
        
     })


    


    //  to get data from client side post
    app.post('/bookings', async(req,res) =>{
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result)
    })


    // to delete a single data from client side 

    app.delete('/bookings/:id' , async(req,res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    

    //  to update single info

    app.patch('/bookings/:id', async(req,res) =>{
      const id = req.params.id;
        const query = { _id: new ObjectId(id)};
        const updateBooking = req.body;
        const updateDoc = {
          $set: {
            status: updateBooking.status
          },
        }
        const result = await bookingCollection.updateOne(query,updateDoc);
        res.send(result);
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



app.get('/', (req, res) =>{
    res.send('client side running')
})

app.listen(port, () =>{
    console.log(`server running on port ${port}`)
})
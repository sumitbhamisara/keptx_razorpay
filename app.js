const Express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const app = Express()



app.use(cors())
// dlkfjsldfjsl
app.use(bodyParser.json())
mongoose.connect('mongodb://keptxtech:mardan8110@ac-oqhdud5-shard-00-00.v8w9wry.mongodb.net:27017,ac-oqhdud5-shard-00-01.v8w9wry.mongodb.net:27017,ac-oqhdud5-shard-00-02.v8w9wry.mongodb.net:27017/keptx_test?ssl=true&replicaSet=atlas-q5c8vd-shard-0&authSource=admin&retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true }).then(res => console.log("db connected")).catch((err) => { console.log(err); });

app.get("/" , (req ,res) =>{
res.json({sucess : true})
})


app.listen(process.env.PORT || 8001 , () =>{
    console.log("server is running")
})
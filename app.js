const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const mongoose = require("mongoose")
const fs = require('fs');
const sharp = require('sharp')
const util = require('util');
const JWT = require('jsonwebtoken')
const path = require('path');
const request = require('request');

const cloudinary = require('cloudinary').v2;

const app = express()

// Configuration 
cloudinary.config({
    cloud_name: "dy9crvf1i",
    api_key: "648213614618838",
    api_secret: "wSkdsc_sZZds2vV3csDs75ZFG8w"
});


app.use(cors({
    origin: "*"
}))
app.use(cookieParser());

app.use("/", express.static(path.join(__dirname, "./public/assets/")));
app.use(express.json());
app.use(express.static("public"));
app.use("/api/", express.static("public"));
app.use("/api/merchant/", express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const Razorpay = require("razorpay");
const instance = new Razorpay({ key_id: "rzp_live_y4MHjh4zXe9laT", key_secret :"CjtJb5ePVbh9XPG643lUNfiq" });
const instanceX = new Razorpay({ key_id: "rzp_test_pH5BGgJrP6JBbN", key_secret: "EIzo5PUj7Gs9UTEJsnpieDts" });

app.use(cors())
app.use(bodyParser.json())
mongoose.connect('mongodb://keptxtech:mardan8110@ac-oqhdud5-shard-00-00.v8w9wry.mongodb.net:27017,ac-oqhdud5-shard-00-01.v8w9wry.mongodb.net:27017,ac-oqhdud5-shard-00-02.v8w9wry.mongodb.net:27017/keptx_test?ssl=true&replicaSet=atlas-q5c8vd-shard-0&authSource=admin&retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true }).then(res => console.log("db connected")).catch((err) => { console.log(err); });





const usersSchema = mongoose.Schema({
    username: String,
    name: String,
    email: String,
    password: String,
    phone: String,
    isAdmin: Boolean,
    isBlocked: { type: Boolean, default: false },
    role: {
        type: String,
        enum: ['user', 'admin', 'merchant', 'staff'],
        default: 'user'
    },
    addresses: Array,
    testApiKey: String,
    liveApiKey: String,
    newMessages: Boolean,
    unreadMessages: Boolean,
    approvedMerchant: String,
    kyc: Boolean,
    kycRef: { type: mongoose.Types.ObjectId, ref: "kyc" },
    balanceRef: { type: mongoose.Types.ObjectId, ref: "balance" },
    qrCode: { type: String, default: "" },
    tokens: [{
        token: String,
    }],
});













//      modals 
const User = mongoose.model("user", usersSchema);



app.get("/" , (req ,res) =>{
res.json({sucess : true})
})

function generateRandomNumber() {
    const max = 99999999;
    const randomNumber = Math.floor(Math.random() * max);
    return randomNumber.toString().padStart(8, '0');
}


function generateRandomId() {
    const length = 10;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890123456789';
    let id = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        id += characters[randomIndex];
    }

    return id;
}


// react native api routes started
const verifyToken = async (req, res, next) => {
    if (req.headers['x-access-token']) {
        const token = req.headers['x-access-token']
        const _id = JWT.verify(token, "mysuperSecret")
        const user = await User.findById(_id)
        if (user) {
            req.user = user
            next()
        } else {
            res.send("Authorization Error !")
        }
    } else {
        res.send('NO Auth Token')
    }
}




app.post("/rn/api/create_qr", verifyToken, async (req, res) => {
    const { name, description } = req.body;
    const options = {
        type: "upi_qr",
        name: name,
        usage: "multiple_use",
        fixed_amount: false,
        description 
    }
    const pipeline = util.promisify(require('stream').pipeline);

    const downloadImage = (fileUrl, imagePath) => {
        return pipeline(
            request(fileUrl),
            fs.createWriteStream(imagePath)
        );
    };


    instance.qrCode.create(options, async function (err, qr) {
        if (err) {
            console.log(err)
            res.send(err);

        } else {
            const randomNum = generateRandomNumber();

            let fileUrl = qr.image_url; // replace with your downloadable file URL
            const imageName = `${qr.name}-${randomNum}.jpg`
            const imagePath = `./public/assets/qrCodes/${imageName}`; // or any other file name
            // request(fileUrl).pipe(fs.createWriteStream(imagePath))
            // setTimeout(() => {
            //     res.redirect('/crop_qr?path='+imagePath)
            // }, 5000);
            downloadImage(fileUrl, imagePath)
                .then(() => {
                    console.log('Image downloaded successfully!');
                    // res.redirect('/crop_qr?imgPath=' + imagePath + "&userID=" + req.user._id)
                    const imgPath = imagePath;
                    const userID = req.user._id;
                    const randomNum = generateRandomNumber();
                    const outputFile = imgPath.split('-')[0] + "-" + randomNum + ".jpg"
                    const imgName = outputFile.split('/')[4]
                    console.log({ outputFile })
                    sharp(imgPath)
                        // Crop the image
                        .extract({ left: 120, top: 630, right: 30, bottom: 20, width: 450, height: 430 })
                        // Save the output image
                        .toFile(outputFile, async (err, info) => {
                            if (err) {
                                console.error(err);
                            } else {
                                const filePath = path.join(__dirname, outputFile);
                                cloudinary.uploader.upload(filePath, async (error, result) => {
                                    if (error) {
                                        console.log(error);
                                        res.status(500).json({ error: 'Failed to upload file' });
                                    } else {
                                        // Send the Cloudinary response to the client
                                        const user = await User.findById(userID)
                                        user.qrCode = result.url;
                                        await user.save()

                                        fs.unlink(filePath, (err) => {
                                            if (err) {
                                                console.error(err);
                                                return;
                                            }
                                            console.log('File removed successfully');
                                        });
                                        res.status(200).json({ success: true, qrCode: result.url });
                                        // res.send(`<img src='${result.url}'/>`)
                                    }
                                });



                                fs.unlink(imgPath, (err) => {
                                    if (err) {
                                        console.error(err);
                                        return;
                                    }
                                    console.log('File removed successfully');
                                });
                                console.log(info);
                            }
                        });

                })
                .catch((error) => {
                    console.error('Error downloading image:', error);
                });
        }
    });
})


// RAZORPAY WEBHOOK URL
app.post("/qr/webhook", (req, res) => {
    console.log("qr webhook")
    const jsonResponse = JSON.stringify(req.body, null, 2);
    console.log({jsonResponse});
    const payment = req.body.payload.payment?.entity
    const qrCode = req.body.payload.qr_code?.entity
    const paymentId = payment.id
    const paymentvpa = payment.vpa
    const paymentAmount = payment.amount
    const QrWalletId  = qrCode.description
    console.log({paymentId  , paymentvpa, paymentAmount , QrWalletId })
    // res.json(req.body)
    res.sendStatus(200);

});








app.listen(process.env.PORT || 8001 , () =>{
    console.log("server is running")
})
app.timeout = 300000; // 5 minutesj
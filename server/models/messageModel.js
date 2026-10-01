import mongoose  from "mongoose"

const messageSchema = new mongoose.Schema({
  sender : {
    type : mongoose.Schema.Types.ObjectId , 
    ref : "User" ,
     required : true
  },
receiver :{
 type : mongoose.Schema.Types.ObjectId ,
  ref : "User" ,
 required : true
} ,
content : {
    type : String,
     required : true ,
      trim : true
} ,
isRead : {
    type : Boolean ,
    default : false
} ,
seenAt : {
    type : Date ,
    default : null
} ,
// Per-user "clear chat": jis user ne history delete ki, uska id yahan push hota hai.
// Dusre user ko messages ab bhi dikhenge.
deletedFor : [{
    type : mongoose.Schema.Types.ObjectId ,
    ref : "User" ,
    default : []
}]

} ,
 {
    timestamps : true
})


messageSchema.index({sender :1 , receiver : 1 , createdAt : -1})

// 24 ghante purane messages DB se automatic permanent delete (TTL index)
// MongoDB background me har ~60 sec check karke expire hue docs hata deta hai
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 })


const Message = mongoose.model("Message" , messageSchema)

export default Message
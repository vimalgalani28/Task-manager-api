const express = require('express')
const User = require('../models/User')
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')
const router = new express.Router()
router.post('/users' ,async (req , res) =>{
    const user = new User(req.body)
    try {
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({user , token})
    } catch(e) {
        res.status(400).send(e.message)
    }
})
router.post('/users/login',async (req , res) => {
    try {
        const user = await User.findByCredentials(req.body.email , req.body.password)
        const token = await user.generateAuthToken()
        res.send({user , token})
    }catch(e){
        res.status(400).send()
    }
    
})
router.post('/users/logout', auth,async (req , res )=>{
    try {
        req.user.tokens = req.user.tokens.filter((token)=>{
            return token.token !== req.token
        })
    await req.user.save()
    res.send('Logged out')
    } catch(e){
        res.status(500).send()
    }
})
router.post('/users/logoutAll',auth,async (req,res)=>{
    try{
        req.user.tokens = []
        await req.user.save()
        res.send('logged out of all devices')
    }catch(e){
        res.status(500).send()
    }
    
})
router.get('/users/me' , auth ,async (req , res) =>{
    res.send(req.user)
})
router.patch('/users/me' ,auth, async (req , res) =>{
    const updates = Object.keys(req.body)
    const allowedupdates = ['name' , 'age' , 'password' , 'email']
    const operation = updates.every((update)=> allowedupdates.includes(update))
    if(!operation){
        return res.status(400).send({
            error : "Invalid updates!"
        })
    }
    try{
        //const user = await User.findByIdAndUpdate(req.params.id , req.body , {new : true , runValidators : true})
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    }catch(e) {
        res.status(400).send(e.message)
    }
})
router.delete('/users/me' ,auth, async (req , res) => {
    try {
        await req.user.remove()
        res.send(req.user)
    } catch(e) {
        res.status(500).send()
    }
})
const upload = multer({
    limits : {
        fileSize : 1000000
    },fileFilter(req , file , cb){
        if(!file.originalname.match(/\.(jpeg|jpg|png)$/)){
            return cb(new Error('Please upload an image'))
        }
        cb(undefined , true)
    }
})
router.post('/users/me/avatar', auth ,upload.single('avatar'),async (req , res)=>{
    const buffer = await sharp(req.file.buffer).resize(250,250).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
},(error , req , res , next)=>{
    res.status(400).send({error : error.message})
})
router.delete('/users/me/avatar',auth, async(req , res)=>{
    try{
        req.user.avatar = undefined
        await req.user.save()
        res.send()
    }catch(e){
        res.status(400).send(e.message)
    }

})
router.get('/users/:id/avatar',async(req , res)=>{
    try{
        const user = await User.findById(req.params.id)
        if(!user || !user.avatar){
            throw new Error()
        }
        res.set('Content-Type','image/png')
        res.send(user.avatar)
    } catch(e){
        res.status(404).send()
    }
})
module.exports = router
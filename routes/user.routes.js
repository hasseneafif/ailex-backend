const express = require('express')
const router  = express.Router()
const UserController = require('../controllers/user.controller')


router.post('/register',UserController.register)
router.post('/login',UserController.login)
router.post('/update',UserController.update)
router.post('/delete',UserController.destroy)


module.exports=router
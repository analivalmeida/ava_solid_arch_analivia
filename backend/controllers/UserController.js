const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const createUserToken = require('../helpers/create-user-token')
const getToken = require('../helpers/get-tokens')
const getUserByToken = require('../helpers/get-user-by-token')

module.exports = class UserController {
    static async register(req, res) {
        const { name, email, phone, password, confirmpassword } = req.body

        if (!name) {
            res.status(422).json({ message: 'Nome é obrigatório' })
            return
        }

        if (!email) {
            res.status(422).json({ message: 'Email é obrigatório' })
            return
        }

        if (!phone) {
            res.status(422).json({ message: 'Telefone é obrigatório' })
            return
        }

        if (!password) {
            res.status(422).json({ message: 'Senha é obrigatória' })
            return
        }

        if (!confirmpassword) {
            res.status(422).json({ message: 'Confirmação de senha é obrigatória' })
            return
        }

        if (password !== confirmpassword) {
            res.status(422).json({ message: 'As senhas não coincidem' })
            return
        }

        const userExists = await User.findOne({ email: email })

        if (userExists) {
            res.status(422).json({ message: 'O usuário já existe em nossos registros.' })
            return
        }

        const salt = await bcrypt.genSalt(12)
        const passwordHash = await bcrypt.hash(password, salt)

        const user = new User({
            name,
            email,
            phone,
            password: passwordHash,
        })

        try {
            const newUser = await user.save()
            await createUserToken(newUser, req, res)
        } catch (error) {
            res.status(503).json({ message: error })
        }
    }

    static async login(req, res) {
        const { email, password } = req.body

        if (!email) {
            res.status(422).json({ message: 'Email é obrigatório' })
            return
        }
        if (!password) {
            res.status(422).json({ message: 'Senha é obrigatória' })
            return
        }
        const userExists = await User.findOne({ email: email })

        if (!userExists) {
            res.status(401).json({
                message: 'Não autorizado, sem registro'
            })
            return
        }

        const checkPassword = await bcrypt.compare(password, userExists.password)

        if (!checkPassword) {
            res.status(401).json({
                message: 'Não autorizado, sem registro'
            })
            return
        }

        await createUserToken(userExists, req, res)
    }

    static async checkUser(req, res) {
        let currentUser

        console.log(req.headers.authorization)

        if (req.headers.authorization) {
            const token = getToken(req)
            const decoded = jwt.verify(token, 'fatec-turma6-a2026')

            currentUser = await User.findById(decoded.id)
            currentUser.password = undefined
        } else {
            currentUser = null
        }

        res.status(200).send(currentUser)
    }

    static async getUserById(req, res) {
        const id = req.params.id

        const user = await User.findById(id)

        if (!user) {
            res.status(404).json({
                message: 'Usuário não encontrado'
            })
            return
        }

        res.status(200).json(user)
    }

    static async editUser(req, res) {
        const token = getToken(req)


        const user = await getUserByToken(token)

        const name = req.body.name
        const email = req.body.email
        const phone = req.body.phone
        const password = req.body.password
        const confirmpassword = req.body.confirmpassword

        let image = ''

        if (req.file) {
            image = req.file.filename
        }

        if (!name) {
            res.status(422).json({ message: 'O nome é obrigatório!' })
            return
        }

        user.name = name

        if (!email) {
            res.status(422).json({ message: 'O e-mail é obrigatório!' })
            return
        }

        const userExists = await User.findOne({ email: email })

        if (user.email !== email && userExists) {
            res.status(422).json({ message: 'Por favor, utilize outro e-mail!' })
            return
        }

        user.email = email

        if (image) {
            const imageName = req.file.filename
            user.image = imageName
        }

        if (!phone) {
            res.status(422).json({ message: 'O telefone é obrigatório!' })
            return
        }

        user.phone = phone

        if (password != confirmpassword) {
            res.status(422).json({ error: 'As senhas não conferem.' })

        } else if (password == confirmpassword && password != null) {
            const salt = await bcrypt.genSalt(12)
            const reqPassword = req.body.password

            const passwordHash = await bcrypt.hash(reqPassword, salt)

            user.password = passwordHash
        }

        try {
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id },
                { $set: user },
                { new: true },
            )
            res.json({
                message: 'Usuário atualizado com sucesso!',
                data: updatedUser,
            })
        } catch (error) {
            res.status(500).json({ message: error })
        }
    }

}


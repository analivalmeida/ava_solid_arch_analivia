const Pet = require('../models/Pet')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const mongoose = require('mongoose')

const getToken = require('../helpers/get-tokens')
const getUserByToken = require('../helpers/get-user-by-token')

module.exports = class PetController {
    static async create(req, res) {
        const { name, age, weight, color } = req.body

        if (!name) {
            res.status(422).json({ message: 'O nome é obrigatório.' })
            return
        }

        if (!age) {
            res.status(422).json({ message: 'A idade é obrigatória.' })
            return
        }

        if (!weight) {
            res.status(422).json({ message: 'O peso é obrigatório.' })
            return
        }

        if (!color) {
            res.status(422).json({ message: 'A cor é obrigatória.' })
            return
        }

        if (!req.files || req.files.length === 0) {
            res.status(422).json({ message: 'Pelo menos uma imagem é obrigatória.' })
            return
        }

        const images = req.files.map((file) => file.filename)

        const token = getToken(req)
        const user = await getUserByToken(token)

        const pet = new Pet({
            name,
            age,
            weight,
            color,
            image: images,
            available: true,
            user: {
                _id: user._id,
                name: user.name,
                image: user.image,
                phone: user.phone
            },
        })

        try {
            const newPet = await pet.save()
            res.status(201).json({ message: 'Pet cadastrado com sucesso!', data: newPet })
        } catch (error) {
            res.status(503).json({ message: error })
        }
    }

    static async getAll(req, res) {
        const pets = await Pet.find().sort('-createdAt')
        res.status(200).json({
            success: true,
            count: pets.length,
            data: pets
        })

        return
    }

    static async getAllUserPets(req, res) {
        const token = getToken(req)
        const user = await getUserByToken(token)

        const pets = await Pet.find({ 'user._id': user._id }).sort('-createdAt')

        res.status(200).json({
            success: true,
            count: pets.length,
            data: pets
        })
    }

    static async getAllUserAdoptions(req, res) {
        const token = getToken(req)
        const user = await getUserByToken(token)

        const pets = await Pet.find({ 'adopter._id': user._id }).sort('-createdAt')

        res.status(200).json({
            success: true,
            count: pets.length,
            data: pets
        })
    }

    static async getPetById(req, res) {
        const id = req.params.id

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(422).json({ message: "O id do pet é inválido." })
            return
        }


        try {
            const pet = await Pet.findById(id)

            if (!pet) {
                res.status(404).json({ message: "Pet não encontrado." })
                return
            }

            return res.status(200).json({
                success: true,
                data: pet
            })

        } catch (error) {
            res.status(503).json({ message: error })
        }


    }

    static async removePetById(req, res) {
        const id = req.params.id

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ message: "O id do pet é inválido." })
        }

        const pet = await Pet.findById(id)

        if (!pet) {
            return res.status(404).json({ message: "Pet não encontrado." })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user._id.toString() !== user._id.toString()) {
            return res.status(401).json({ message: "Não autorizado, você não é o dono do pet." })
        }

        await Pet.findByIdAndDelete(id)
        return res.status(200).json({ message: "Pet removido com sucesso", data: pet })
    }

    static async updatePet(req, res) {
        const { id } = req.params
        const { name, age, weight, color, available } = req.body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ message: 'ID do pet inválido.' })
        }

        const pet = await Pet.findById(id)

        if (!pet) {
            return res.status(404).json({ message: 'Pet não encontrado.' })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Acesso negado. Você não é o dono desse pet.' })
        }

        const updatedData = {}

        if (name) updatedData.name = name
        if (age) updatedData.age = age
        if (weight) updatedData.weight = weight
        if (color) updatedData.color = color
        if (available !== undefined) updatedData.available = available

        if (req.files && req.files.length > 0) {
            updatedData.image = req.files.map((file) => file.filename)
        }

        const updatedPet = await Pet.findByIdAndUpdate(id, updatedData, { new: true })

        res.status(200).json({ message: 'Pet atualizado com sucesso.', data: updatedPet })

    }

    static async schedule(req, res) {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ message: 'ID inválido.' })
        }

        const pet = await Pet.findById(id)

        if (!pet) {
            return res.status(404).json({ message: 'Pet não encontrado.' })
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user._id.toString() === user._id.toString()) {
            return res.status(403).json({ message: 'Você não pode agendar uma visita para o seu próprio pet.' })
        }

        pet.adopter = {
            _id: user._id,
            name: user.name,
            image: user.image,
            phone: user.phone,
        }

        await pet.save()

        res.status(200).json({ message: 'Visita agendada com sucesso!.' })
    }

    static async concludeAdoption(req, res) {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ message: 'ID inválido.'})
        }

        const pet = await Pet.findById(id)

        if (!pet) {
            return res.status(404).json({ message: 'Pet não encontrado.'})
        }

        const token = getToken(req)
        const user = await getUserByToken(token)

        if (pet.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Acesso negado. Você não é o dono desse pet.'})
        }

        await Pet.findByIdAndUpdate(id, { available: false })

        res.status(200).json({ message: 'Adoção concluída com sucesso.' })

    }
}
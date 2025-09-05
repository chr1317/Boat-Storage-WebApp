const express = require('express');
const { User } = require('../Models'); // Adjust path as needed
const { Op } = require('sequelize');

const router = express.Router();

router.get('/users', async (req, res) => {

    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('login', async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: req.body.email },
                    { login: req.body.login },
                ],
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Invalid login or password' });
        }
        if(!bcrypt.compareSync(password, user.passwd)) {
            return res.status(401).json({ message: 'Invalid login or password'});
        }
        
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

const isEditProfileValid = (req) => {
    const allowedFields = ['firstName', 'lastName', 'about', 'skills', 'photoUrl', 'age', 'birthDate','gender'];
    const isEditAllowed = Object.keys(req.body).every(field => allowedFields.includes(field));

    return isEditAllowed;
}

module.exports = { isEditProfileValid };
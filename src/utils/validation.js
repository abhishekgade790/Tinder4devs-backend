const isEditProfileValid = (req) => {
    const allowedFields = ['firsName', 'lastName', 'about', 'skills', 'photoUrl','age'];
    const isEditAllowed = Object.keys(req.body).every(field => allowedFields.includes(field));

    return isEditAllowed;
}

module.exports = { isEditProfileValid };
const Joi = require('joi');

module.exports = Joi.object({
    sequenceSchemas: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string(),
        fields: Joi.array().items(Joi.object({
            name: Joi.string().required(),
            type: Joi.string().required(),
            isRequired: Joi.boolean().required(),
            isMulti: Joi.boolean(),
            lookupEntity: Joi.string(),
            lookupBy: Joi.string(),
            entitySchemaLink: Joi.string(),
            options: Joi.array().items(Joi.object({
                id: Joi.string().required(),
                name: Joi.string().required()
            })).min(1)
        })).required()
    })).required(),
    projects: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        sequenceSchemas: Joi.array().items(Joi.string()).required().unique()
    }))
})
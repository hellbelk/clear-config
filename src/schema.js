const Joi = require('joi');

module.exports = Joi.object({
    sequenceSchemas: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('DNA', 'AA').required(),
        fields: Joi.array().items(Joi.object({
            name: Joi.string().required(),
            type: Joi.string().required(),
            isRequired: Joi.boolean().required(),
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
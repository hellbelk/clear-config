"use strict"

const fs = require("fs");
const axios = require('axios').default;

const env = process.argv[2] || 'dev';
require('dotenv').config({path: `.env${env}`});

const schema = require('./schema');

axios.defaults.baseURL = process.env.BENCHLING_API_URL;
axios.defaults.headers.common['Authorization'] = `Basic ${Buffer.from(`${process.env.BENCHLING_API_KEY}:`).toString('base64')}`;

// const types = config.sequenceSchemas.reduce((res, s) => {
//     s.fields.forEach(f => res[f.type] = res[f.type] ? res[f.type] + 1 : 1);
//     return res;
// }, {});
//
// Object.entries(types).forEach(([type, count]) => console.log(`${type}: ${count}`));


const testFieldReference = async (schemaName, fieldName, entityType, entitySchemaId) => {
    const params = {};
    if (entitySchemaId && entitySchemaId !== 'all') {
        params.schemaId = entitySchemaId;
    }

    const res = await axios.get(`/${entityType}`, {params}).catch(e => ({
        status: e.response.status
    }));

    if (res.status === 404) {
        console.error(`>>> sequence schema "${schemaName}" field "${fieldName}" refers to unknown entity type "${entityType}"`);
        return false;
    } else if (res.status === 200) {
        const data = Object.values(res.data).find(v => Array.isArray(v));
        if (!data || !data.length) {
            console.error(`>>> sequence schema "${schemaName}" field "${fieldName}" referenced entity does not contain any data for resolve`);
            return false;
        }
    } else {
        throw new Error("unexpected response from benchling " + res.status);
    }

    return true;
}

const processConfig = async (envName) => {
    console.log(`clear ${envName} config`);
    const {error, value: config} = schema.validate(require(`../configuration_src_${envName}.json`), {stripUnknown: true});

    if (error) {
        console.error('>>> config schema invalid');
        error.details.forEach(d => console.log(d.message));
        throw new Error("invalid config format");
    }

    let hasError = false;
    //more complex schema validation
    console.log('test for unknown schemas');
    const schemas = config.sequenceSchemas.reduce((res, s) => {
        res[s.name] = s;
        return res;
    }, {});
    config.projects.forEach(p => {
        const unknownSchemas = p.sequenceSchemas.filter(sn => !schemas.hasOwnProperty(sn));
        if (unknownSchemas.length) {
            hasError = true;
            console.log(`>>> project "${p.name}" contains unknown schemas: ${unknownSchemas.join(', ')}`)
        }
    });

    console.log('test for unused schemas');
    const projectSchemas = config.projects.reduce((res, p) => {
        p.sequenceSchemas.forEach(s => res.add(s));
        return res;
    }, new Set());

    config.sequenceSchemas.filter(s => !projectSchemas.has(s.name)).forEach(s => {
        hasError = true;
        console.log(`>>> schema "${s.name}" is never use`);
    });

    config.sequenceSchemas.forEach(schema => schema.fields.forEach(field => {
        if (field.type === 'lookup') {
            if (!field.lookupEntity) {
                hasError = true;
                console.log(`>>> sequence schema "${schema.name}" field ${field.name} must has "lookupEntity" property`);
            }

            if (!field.lookupBy) {
                hasError = true;
                console.log(`>>> sequence schema "${schema.name}" field ${field.name} must has "lookupBy" property`);
            }
        } else if (field.type !== 'lookup' && field.entitySchemaLink) {
            hasError = true;
            console.log(`>>> sequence schema "${schema.name}" field ${field.name} entitySchemaLink property use only in lookup fields`);
        }
    }));

    if (hasError) {
        throw new Error("invalid config format");
    }

    console.log('test schemas in benchling');
    for(const schema of config.sequenceSchemas) {
        const res = await axios.get(`/entity-schemas/${schema.id}`).catch(e => {
            if (e.response && e.response.status) {
                return {status: e.response.status}
            } else {
                console.log(e.message);
                throw new Error(e);
            }
        });
        if (res.status === 404) {
            console.log(`>>> sequence schema "${schema.name}" not found in benchling`);
        } else if (res.status === 200) {
            const benchlingSchema = res.data;
            schema.type = benchlingSchema.type;

            const fieldDefinitions = benchlingSchema.fieldDefinitions.filter(f => !f.archiveRecord);
            const unknownFields = schema.fields.filter(f => !fieldDefinitions.find(fd => fd.name === f.name)).map(f => f.name);
            if (unknownFields.length) {
                console.log(`>>> sequence schema "${schema.name}" contains fields undefined in benchling schema: ${unknownFields.join(', ')}`);
            }

            const requiredFields = fieldDefinitions.filter(f => f.isRequired);

            const skippedRequiredFields = requiredFields.filter(fd => !schema.fields.find(f => fd.name === f.name));
            if (skippedRequiredFields.length) {
                console.log(`>>> sequence schema "${schema.name}" does not contains required fields: ${skippedRequiredFields.join(', ')}`);
            }

            const invalidMandatory = schema.fields.filter(f => !f.isRequired).filter(f => requiredFields.find(fd => fd.name === f.name )).map(f => f.name);
            if (invalidMandatory.length) {
                console.log(`>>> sequence schema "${schema.name}" contain fields those must be mandatory: ${invalidMandatory.join(', ')}`);
            }

            for (const field of schema.fields) {
                const fieldDefinition = fieldDefinitions.find(fd => fd.name === field.name);
                field.isMulti = fieldDefinition.isMulti;
                if (field.type === 'lookup') {
                    hasError &= await testFieldReference(schema.name, field.name, field.lookupEntity, field.entitySchemaLink);
                } else if (field.type === 'dropdown'){
                    if (fieldDefinition.type === 'dropdown') {
                        const {data: dropdown} = await axios.get(`/dropdowns/${fieldDefinition.dropdownId}`);
                        if (dropdown.archiveRecord) {
                            hasError = true;
                            console.error(`>>> sequence schema ${schema.name} field "${field.name}" linked dropdown was deleted`);
                        } else {
                            field.options = dropdown.options.filter(o => !o.archiveRecord).map(o => ({id: o.id, name: o.name}));
                            if (!field.options.length) {
                                hasError = true;
                                console.error(`>>> sequence schema ${schema.name} field "${field.name}" with dropdown type does not contains options`);
                            }
                        }
                    }
                }
            }
        }
    }

    if (hasError) {
        throw new Error('incorrect benchling reference');
    }

    fs.writeFileSync(`./configuration_${envName}.json`, JSON.stringify(config));
};

processConfig(env);
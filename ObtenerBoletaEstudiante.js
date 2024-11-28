// Importar el SDK de AWS
const AWS = require('aws-sdk');

// Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const lambdaClient = new AWS.Lambda();

exports.lambda_handler = async (event) => {

    // Obtener el token del encabezado
    const token = event.headers?.Authorization;
    if (!token) {
        return {
            statusCode: 401,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'error',
                message: 'Token no proporcionado. Acceso no autorizado.',
            }, null, 2),
        };
    }

    // Invocar el Lambda para validar el token
    const payload = { token };
    const invokeParams = {
        FunctionName: 'ValidarTokenEstudiante', // Nombre del Lambda de validación
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(payload),
    };

    const invokeResponse = await lambdaClient.invoke(invokeParams).promise();
    const validationResponse = JSON.parse(invokeResponse.Payload);

    if (validationResponse.statusCode === 403) {
        return {
            statusCode: 403,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'error',
                message: 'Acceso no autorizado. Token inválido.',
            }, null, 2),
        };
    }

    
    // Obtener valores del cuerpo de la solicitud
    let tenantId, c_estudiante_c_programa;
    if (typeof event.body === 'string') {
        const parsedBody = JSON.parse(event.body);
        tenantId = parsedBody['tenant_id'];
        c_estudiante_c_programa = parsedBody['c_estudiante#c_programa'];
    } else {
        tenantId = event.body['tenant_id'];
        c_estudiante_c_programa = event.body['c_estudiante#c_programa'];
    }

    try {
        // Parámetros para consultar en DynamoDB
        const params = {
            TableName: 'tabla_boletas',
            Key: {
                'tenant_id': tenantId,
                'c_estudiante#c_programa': c_estudiante_c_programa,
            },
        };

        // Obtener el item correspondiente
        const data = await dynamoDB.get(params).promise();

        // Validar si el item existe
        if (!data.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'error',
                    message: 'No se encontró la boleta con los datos proporcionados.',
                }, null, 2),
            };
        }

        // Extraer datos_boleta
        const datos_boleta = data.Item.datos_boleta;

        // Retornar los datos_boleta
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                status: 'success',
                datos_boleta: datos_boleta,
            },
        };
    } catch (error) {
        console.error('Error al consultar DynamoDB:', error);

        // Retornar error en caso de fallo
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'error',
                message: 'Ocurrió un error al procesar la solicitud.',
                error: error.message,
            }, null, 2),
        };
    }
};

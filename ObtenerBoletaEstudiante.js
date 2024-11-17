// Importar el SDK de AWS
const AWS = require('aws-sdk');

// Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.lambda_handler = async (event) => {
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
            body: JSON.stringify({
                status: 'success',
                datos_boleta: datos_boleta,
            }, null, 2),
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
// Importar el SDK de AWS
const AWS = require("aws-sdk");

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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        {
          status: "error",
          message: "Token no proporcionado. Acceso no autorizado.",
        },
        null,
        2
      ),
    };
  }

  // Invocar el Lambda para validar el token
  const payload = { token };
  const invokeParams = {
    FunctionName: "ValidarTokenEstudiante", // Nombre del Lambda de validación
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(payload),
  };

  const invokeResponse = await lambdaClient.invoke(invokeParams).promise();
  const validationResponse = JSON.parse(invokeResponse.Payload);

  if (validationResponse.statusCode === 403) {
    return {
      statusCode: 403,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        {
          status: "error",
          message: "Acceso no autorizado. Token inválido.",
        },
        null,
        2
      ),
    };
  }

  // Obtener valores del cuerpo de la solicitud
  let tenantId, cEstudiante, cPrograma, empresaBancaria, monto, descuentoAplicado;
  if (typeof event.body === "string") {
    const parsedBody = JSON.parse(event.body);
    tenantId = parsedBody.tenant_id;
    cEstudiante = parsedBody.c_estudiante;
    cPrograma = parsedBody.c_programa;
    empresaBancaria = parsedBody.empresa_bancaria;
    monto = parsedBody.monto;
    descuentoAplicado = parsedBody.descuento_aplicado;
  } else {
    tenantId = event.body.tenant_id;
    cEstudiante = event.body.c_estudiante;
    cPrograma = event.body.c_programa;
    empresaBancaria = event.body.empresa_bancaria;
    monto = event.body.monto;
    descuentoAplicado = event.body.descuento_aplicado;
  }

  // Unir c_estudiante y c_programa
  const cEstudianteCPrograma = `${cEstudiante}#${cPrograma}`;

  // Generar fecha y hora actuales
  const fechaActual = new Date();
  const fechaPago = fechaActual.toISOString().split("T")[0]; // Formato YYYY-MM-DD
  const horaPago = fechaActual.toTimeString().split(" ")[0]; // Formato HH:MM:SS

  // Construir el JSON para enviar a DynamoDB
  const datosBoleta = {
    empresa_bancaria: empresaBancaria,
    fecha_pago: fechaPago,
    hora_pago: horaPago,
    monto: monto,
  };

  if (descuentoAplicado > 0) {
    datosBoleta.descuento_aplicado = `${descuentoAplicado}%`;
  }

  const item = {
    tenant_id: tenantId,
    "c_estudiante#c_programa": cEstudianteCPrograma,
    datos_boleta: datosBoleta,
  };

  // Parámetros para insertar en DynamoDB
  const params = {
    TableName: "tabla_boletas",
    Item: item,
  };

  try {
    // Insertar la boleta en DynamoDB
    await dynamoDB.put(params).promise();

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
          status: "success",
          message: "Boleta creada exitosamente.",
          datos_boleta: datosBoleta,
        },
    };
  } catch (error) {
    console.error("Error al insertar boleta en DynamoDB:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        {
          status: "error",
          message: "Ocurrió un error al crear la boleta.",
          error: error.message,
        },
        null,
        2
      ),
    };
  }
};

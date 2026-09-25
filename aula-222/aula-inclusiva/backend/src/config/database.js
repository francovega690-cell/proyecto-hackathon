import { Sequelize } from "sequelize";

// conexion a la base de datos
// En hostings como Railway/Render/Aiven suele venir una sola URL de conexión
// (DATABASE_URL o MYSQL_URL); si no, se usan las variables sueltas DB_*.
// DB_SSL=true activa SSL, que la mayoría de los MySQL en la nube exige.
const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
const options = {
  dialect: process.env.DB_DIALECT || "mysql",
  logging: false,
  ...(process.env.DB_SSL === "true" && {
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  }),
};

export const sequelize = url
  ? new Sequelize(url, options)
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      ...options,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    });

// testear la conexion y sincronizar los modelos
export const startDB = async () => {
  await sequelize.authenticate();
  // ⚠ DB_RESET=true recrea las tablas en cada arranque (borra todo): solo
  // para desarrollo/demo. En producción dejalo vacío: sync() solo crea las
  // tablas que falten, sin tocar los datos.
  await sequelize.sync({ force: process.env.DB_RESET === "true" });
  await addMissingColumns();
  console.log("Conexion a la db esta lista");
};

// sync() no agrega columnas nuevas a tablas que ya existen. Para no tener que
// borrar la base cuando se suma un campo, se agregan acá las que falten.
const addMissingColumns = async () => {
  const qi = sequelize.getQueryInterface();
  for (const model of Object.values(sequelize.models)) {
    const table = model.getTableName();
    const existing = await qi.describeTable(table);
    for (const attr of Object.values(model.getAttributes())) {
      if (!existing[attr.field]) {
        await qi.addColumn(table, attr.field, attr);
        console.log(`Columna agregada: ${typeof table === "string" ? table : table.tableName}.${attr.field}`);
      }
    }
  }
};

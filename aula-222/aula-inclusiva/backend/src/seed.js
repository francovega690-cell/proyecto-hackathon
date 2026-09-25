// Carga datos de demostración: los mismos usuarios/materias que tenía la
// versión de prueba en localStorage, para poder mostrar la app sin tener
// que cargar todo a mano. Uso: npm run seed (recrea las tablas).
import "dotenv/config";
import { sequelize } from "./config/database.js";
import { hashPassword } from "./helpers/bcrypt.helper.js";
import { localAdapt } from "./helpers/adapt.helper.js";
import { generateCourseCode } from "./helpers/code.helper.js";

import { UserModel } from "./models/user.model.js";
import { CourseModel } from "./models/course.model.js";
import "./models/course_member.model.js";
import { PostModel } from "./models/post.model.js";
import "./models/post_file.model.js";
import { SubmissionModel } from "./models/submission.model.js";
import "./models/submission_file.model.js";
import { CommentModel } from "./models/comment.model.js";

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function run() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const pass = await hashPassword("1234");

  const profe = await UserModel.create({ firstName: "Laura", lastName: "Gómez", email: "profe@demo.com", password: pass, role: "profesor" });
  const mateo = await UserModel.create({ firstName: "Mateo", lastName: "Ríos", email: "mateo@demo.com", password: pass, role: "alumno", supportType: "daltonismo", cvdType: "deuteranopia", testDone: true, filterOn: true });
  const sofia = await UserModel.create({ firstName: "Sofía", lastName: "Paz", email: "sofia@demo.com", password: pass, role: "alumno", supportType: "dislexia", dyslexiaLevel: "moderado", testDone: true });
  const lucas = await UserModel.create({ firstName: "Lucas", lastName: "Vera", email: "lucas@demo.com", password: pass, role: "alumno", supportType: "comprension", testDone: true });
  // Alumno con dos apoyos a la vez: daltonismo (deuteranopía) + dislexia severa.
  const tomas = await UserModel.create({ firstName: "Tomás", lastName: "Leiva", email: "tomas@demo.com", password: pass, role: "alumno", supportType: "dislexia", supports: "dislexia,daltonismo", cvdType: "deuteranopia", dyslexiaLevel: "severo", testDone: true, filterOn: true });
  const ana = await UserModel.create({ firstName: "Ana", lastName: "Duarte", email: "ana@demo.com", password: pass, role: "alumno", supportType: "daltonismo", cvdType: "acromatopsia", testDone: true, filterOn: true });

  const bio = await CourseModel.create({
    name: "Biología 2°A",
    description: "Células, plantas y ecosistemas.",
    code: "BIO2A7",
    color: 0,
    icon: 0,
    teacherId: profe.id,
  });
  await bio.addMembers([mateo.id, sofia.id, lucas.id, ana.id, tomas.id]);

  const mat = await CourseModel.create({
    name: "Matemática 1°B",
    description: "Operaciones, ecuaciones y problemas.",
    code: "MAT1B4",
    color: 1,
    icon: 1,
    teacherId: profe.id,
  });
  await mat.addMember(mateo.id);

  const mkAdapted = (title, body) => ({ source: "local", ...localAdapt({ title, body }) });

  const avisoBody =
    "Chicos, la clase del jueves se hace en el laboratorio. Traigan guardapolvo y su cuaderno. Vamos a observar células al microscopio.";
  const teoriaBody =
    "La fotosíntesis es el proceso por el cual las plantas producen su alimento. Usan la luz del sol, agua y dióxido de carbono. El resultado es glucosa y oxígeno. Todo esto ocurre en los cloroplastos, unas estructuras que contienen clorofila, el pigmento verde de las hojas.";
  const tareaBody =
    "Observá el gráfico de la clase, donde la línea roja muestra el oxígeno producido y la línea verde el dióxido de carbono consumido. Explicá con tus palabras qué relación hay entre ambas líneas. Agregá un ejemplo de la vida cotidiana.";
  const tarea2Body = "Resolvé los ejercicios 1 al 5 de la página 42. Anotá cada paso del procedimiento. Al final, revisá tu resultado con la calculadora.";

  const p1 = await PostModel.create({ courseId: bio.id, authorId: profe.id, type: "aviso", title: "Clase en el laboratorio", body: avisoBody, adapted: mkAdapted("Clase en el laboratorio", avisoBody), adaptStatus: "ready" });
  await PostModel.create({ courseId: bio.id, authorId: profe.id, type: "teoria", title: "Marco teórico: la fotosíntesis", body: teoriaBody, fileName: "fotosintesis.pdf", adapted: mkAdapted("Marco teórico", teoriaBody), adaptStatus: "ready" });
  const p3 = await PostModel.create({ courseId: bio.id, authorId: profe.id, type: "tarea", title: "Relación entre oxígeno y CO₂", body: tareaBody, dueDate: daysFromNow(4), adapted: mkAdapted("Relación entre oxígeno y CO₂", tareaBody), adaptStatus: "ready" });
  await PostModel.create({ courseId: mat.id, authorId: profe.id, type: "tarea", title: "Ejercicios de la página 42", body: tarea2Body, dueDate: daysFromNow(2), adapted: mkAdapted("Ejercicios", tarea2Body), adaptStatus: "ready" });

  await SubmissionModel.create({
    postId: p3.id,
    studentId: sofia.id,
    text: "Cuando la planta produce más oxígeno, gasta más dióxido de carbono. Por ejemplo, un jardín al mediodía.",
    submittedAt: new Date(),
  });

  await CommentModel.create({ postId: p3.id, authorId: lucas.id, visibility: "public", text: "¿Hay que entregarlo escrito a mano o en digital?" });
  await CommentModel.create({ postId: p3.id, authorId: sofia.id, studentId: sofia.id, visibility: "private", text: "Profe, ¿puedo entregar el ejemplo con un dibujo?" });

  console.log("Listo. Usuarios de prueba (contraseña 1234):");
  console.log("  profe@demo.com  (profesora)");
  console.log("  mateo@demo.com  (alumno, deuteranopía)");
  console.log("  sofia@demo.com  (alumna, dislexia moderada)");
  console.log("  lucas@demo.com  (alumno, comprensión)");
  console.log("  ana@demo.com    (alumna, acromatopsia)");
  console.log("  tomas@demo.com  (alumno, deuteranopía + dislexia severa)");
  console.log(`Códigos de materia: ${bio.code} (Biología) / ${mat.code} (Matemática)`);

  await sequelize.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

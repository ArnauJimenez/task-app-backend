import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app'; // 👈 Añadidas las llaves
import { prisma } from '../prisma/client';

describe('Pruebas de Autenticación (Auth Endpoints)', () => {
  
  // Limpieza: Antes de ejecutar los tests, borramos el usuario de prueba por si acaso
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'test_test@gmail.com' },
    });
  });

  // Desconectar Prisma al terminar todos los tests para no dejar conexiones colgadas
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Debería rebotar el registro si los datos no pasan la validación de Zod', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'email-invalido', // Zod saltará aquí
        password: '123'          // Muy corto
      });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.errors).toBeDefined();
  });

  test('Debería registrar un nuevo usuario correctamente', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test_test@gmail.com',
        password: 'superpassword123'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test_test@gmail.com');
  });
});
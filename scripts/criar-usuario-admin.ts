/**
 * Bootstrap do primeiro usuário ADMIN de uma clínica.
 *
 * Não existe endpoint público de registro (por design — só ADMIN cria
 * usuários via POST /usuarios), então o primeiro admin de cada clínica
 * precisa ser criado por aqui, uma vez, direto no banco.
 *
 * Uso:
 *   npx ts-node scripts/criar-usuario-admin.ts <clinicaId> <nome> <email> <senha>
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const [clinicaId, nome, email, senha] = process.argv.slice(2);
  if (!clinicaId || !nome || !email || !senha) {
    console.error('Uso: npx ts-node scripts/criar-usuario-admin.ts <clinicaId> <nome> <email> <senha>');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error('Senha precisa ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) {
      console.error(`Clínica ${clinicaId} não encontrada.`);
      process.exit(1);
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.upsert({
      where: { clinicaId_email: { clinicaId, email } },
      update: { senhaHash, papel: 'ADMIN', ativo: true, nome },
      create: { clinicaId, nome, email, senhaHash, papel: 'ADMIN' },
    });

    console.log(`Usuário ADMIN pronto: ${usuario.email} (id ${usuario.id}) na clínica ${clinica.nome}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();

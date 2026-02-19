/**
 * Data Migration Script: MySQL to Firestore
 * 
 * Instructions:
 * 1. Download your service account key from Firebase Console: 
 *    Project Settings > Service Accounts > Generate new private key.
 * 2. Save it as `serviceAccountKey.json` in the `/server` folder.
 * 3. Run: `node migrate_to_firebase.js`
 */

import admin from 'firebase-admin'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'))

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()
const auth = admin.auth()

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cirurtec_db',
})

async function migrate() {
    console.log('🚀 Starting Migration...')

    // 1. Migrate Clients
    console.log('📦 Migrating Clients...')
    const [clients] = await pool.query('SELECT * FROM clients')
    for (const client of clients) {
        try {
            const docId = client.cnpj.replace(/\D/g, '')
            await db.collection('clients').doc(docId).set({
                cnpj: client.cnpj,
                nome_hospital: client.nome_hospital,
                nome_fantasia: client.nome_fantasia,
                emails: [client.email1, client.email2].filter(Boolean),
                contatos: [client.contato1, client.contato2].filter(Boolean),
                public_ID: client.public_ID,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(client.created_at)),
                updatedAt: admin.firestore.Timestamp.fromDate(new Date(client.updated_at))
            })
            console.log(`✅ Client ${client.cnpj} migrated.`)
        } catch (e) {
            console.error(`❌ Failed to migrate client ${client.cnpj}:`, e.message)
        }
    }

    // 2. Migrate Equipments
    console.log('📦 Migrating Equipments...')
    const [equipments] = await pool.query('SELECT * FROM equipments')
    for (const eq of equipments) {
        try {
            await db.collection('equipments').doc(eq.id).set({
                clientId: eq.client_id,
                equipamento: eq.equipamento,
                modelo: eq.modelo,
                numeroSerie: eq.numero_serie,
                dataNota: eq.data_nota,
                tipoInstalacao: eq.tipo_instalacao,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(eq.created_at))
            })
            console.log(`✅ Equipment ${eq.id} migrated.`)
        } catch (e) {
            console.error(`❌ Failed to migrate equipment ${eq.id}:`, e.message)
        }
    }

    // 3. Migrate Users (Auth + Firestore Profile)
    console.log('👤 Migrating Users...')
    const [users] = await pool.query('SELECT * FROM users')
    for (const user of users) {
        try {
            // Create in Firebase Auth
            const userRecord = await auth.createUser({
                email: user.email,
                password: 'ChangeMe123!', // Temporary password
                displayName: user.username,
            })

            // Create in Firestore /users
            await db.collection('users').doc(userRecord.uid).set({
                username: user.username,
                email: user.email,
                role: user.role,
                rights: user.rights,
                public_ID: user.public_ID,
                receive_warranty_emails: !!user.receive_warranty_emails,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(user.created_at))
            })
            console.log(`✅ User ${user.email} migrated.`)
        } catch (e) {
            console.error(`❌ Failed to migrate user ${user.email}:`, e.message)
        }
    }

    console.log('✨ Migration Finished!')
    process.exit(0)
}

migrate().catch(console.error)

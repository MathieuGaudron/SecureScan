const { Sequelize } = require('sequelize');

// ========================================
// CONFIGURATION POSTGRESQL
// ========================================

const sequelize = new Sequelize(
  process.env.DB_NAME || 'securescan',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    
    // Logging
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Pool de connexions
    pool: {
      max: 5,           // Nombre max de connexions
      min: 0,           // Nombre min de connexions
      acquire: 30000,   // Temps max (ms) pour acquérir une connexion
      idle: 10000       // Temps max (ms) avant de libérer une connexion inactive
    },
    
    // Options supplémentaires
    define: {
      timestamps: true,      // Ajoute createdAt et updatedAt automatiquement
      underscored: false,    // Utilise camelCase (pas snake_case)
      freezeTableName: true  // Utilise le nom de modèle exact comme nom de table
    }
  }
);

// ========================================
// TEST DE CONNEXION (optionnel)
// ========================================

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
    throw error;
  }
};

// Exporter sequelize et la fonction de test
module.exports = { 
  sequelize,
  testConnection 
};
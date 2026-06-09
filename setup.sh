# setup.sh
echo "Starting containers..."
docker compose up -d
echo "Applying database migrations..."
npx prisma migrate deploy
echo "Ready to start server: npm start"
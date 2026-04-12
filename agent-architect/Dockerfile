# Etapa 1: Construcción (Maven + Node)
FROM maven:3.9.5-eclipse-temurin-17 AS build
WORKDIR /app

# Copiamos primero el archivo POM
COPY pom.xml .
# Descargamos las dependencias para que queden cacheadas en la capa de Docker
RUN mvn dependency:go-offline -B || true

# Copiamos el código fuente de la aplicación (incluyendo frontend y backend)
COPY src ./src
COPY frontend ./frontend

# Ejecutamos el empaquetado. 
# Esto lanzará el frontend-maven-plugin que descarga Node y construye el frontend.
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (Solo JRE para hacer la imagen más ligera)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copiamos el JAR empaquetado (que ya contiene los estáticos del frontend en /static)
COPY --from=build /app/target/hackatin-0.0.1-SNAPSHOT.jar app.jar

# Exponemos el puerto
EXPOSE 8080

# Ejecutamos la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]
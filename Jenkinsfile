pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        REGISTRY = 'ghcr.io'
    }

    stages {
        stage('Pull Images') {
            steps {
                echo 'Pulling latest Docker images...'
                sh 'docker compose pull'
            }
        }

        stage('Stop Containers') {
            steps {
                echo 'Stopping existing containers...'
                sh 'docker compose down --remove-orphans'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying updated containers...'
                sh 'docker compose up -d'
            }
        }

        stage('Verify') {
            steps {
                echo 'Verifying deployment...'
                script {
                    sleep(time: 30, unit: 'SECONDS')
                    def expectedContainers = [
                        'foodwaste-postgres',
                        'foodwaste-auth',
                        'foodwaste-food',
                        'foodwaste-claim',
                        'foodwaste-notification',
                        'foodwaste-frontend'
                    ]
                    def runningContainers = sh(
                        script: 'docker ps --filter status=running --format "{{.Names}}"',
                        returnStdout: true
                    ).trim()

                    expectedContainers.each { container ->
                        if (!runningContainers.contains(container)) {
                            error "Container ${container} is not running!"
                        }
                    }
                    echo 'All containers are running successfully!'
                }
            }
        }

        stage('Cleanup') {
            steps {
                echo 'Cleaning up unused Docker images...'
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success {
            echo 'Deployment completed successfully!'
        }
        failure {
            echo 'Deployment failed! Check logs above.'
        }
    }
}

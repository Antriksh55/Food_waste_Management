pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        REGISTRY = 'ghcr.io'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/master']],
                    userRemoteConfigs: [[url: 'https://github.com/Antriksh55/Food_waste_Management.git']]
                ])
            }
        }

        stage('Pull Images') {
            steps {
                echo 'Pulling latest Docker images...'
                sh 'docker compose pull --ignore-pull-failures || true'
            }
        }

        stage('Stop Containers') {
            steps {
                echo 'Stopping existing app containers...'
                sh '''
                    docker stop foodwaste-auth foodwaste-food foodwaste-claim foodwaste-notification foodwaste-frontend foodwaste-postgres 2>/dev/null || true
                    docker rm foodwaste-auth foodwaste-food foodwaste-claim foodwaste-notification foodwaste-frontend foodwaste-postgres 2>/dev/null || true
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying updated containers...'
                sh '''
                    docker compose up -d \
                        postgres \
                        auth-service \
                        food-service \
                        claim-service \
                        notification-service \
                        frontend
                '''
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

                    echo "Running containers:\n${runningContainers}"

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

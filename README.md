# Widoo Back

Simple backend server for the Widoo application.

# Environment variables

## Server
| Name | Required | Description | Default value |
|:----:|:--------:|:-----------:|:--------------|
| SERVER_PORT | false | The default server port | 8080 |

## Database
| Name | Required | Description | Default value |
|:----:|:--------:|:-----------:|:--------------|
| DB_HOST | false | The host of the database | localhost |
| DB_USER | false | The user of the database | widoo |
| DB_PASSWORD | false | The user's password | widoo |
| DB_NAME | false | The name of the database to use | widoo |

## Security
| Name | Required | Description | Default value |
|:----:|:--------:|:-----------:|:--------------|
| APPLICATION_KEY | false | The application key that should be provided by the frontend application | mostSecretKeyEver |

## Logs
| Name | Required | Description | Default value |
|:----:|:--------:|:-----------:|:--------------|
| LOG_REQUESTS | false | If true, the received requests will be logged | false |
/**
 * Enum representing CRUD operations for use cases
 * Used to determine HTTP methods and routing behavior
 */
export enum CrudType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete'
}

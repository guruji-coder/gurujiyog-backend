// Simple test to ensure Jest is working
describe('Memory Cache Tests', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with objects', () => {
    const obj = { name: 'test' };
    expect(obj.name).toBe('test');
  });

  it('should work with promises', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});
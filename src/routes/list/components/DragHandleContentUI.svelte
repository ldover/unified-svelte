<script lang="ts">
  let color: string = '#6b7280'
</script>

<div>
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.29028 5.5L8.79028 3M8.79028 3L11.2903 5.5M8.79028 3V6.375V9.75M8.79028 16.5C8.79028 16.5 7.26659 14.9763 6.29028 14M8.79028 16.5C8.79028 16.5 10.314 14.9763 11.2903 14M8.79028 16.5V13.125V9.75M8.79028 9.75H15.7903M8.79028 9.75H2M15.7903 9.75L13.2903 7.5M15.7903 9.75L13.2903 12M2 9.75L4.29028 7.5M2 9.75L4.29028 12"
      stroke={color}
      stroke-opacity={1}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</div>

<style>
  div {
    padding: 2px;
      
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 5px;
    cursor: default;
  }

  div:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
</style>

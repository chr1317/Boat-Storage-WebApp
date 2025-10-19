<script setup>
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import { onMounted } from "vue";

const router = useRouter();
const route = useRoute();

onMounted(async () => {
  const qr = route.params.qr;
  try {
    const res = await axios.get(`/api/boats/byqr/${qr}`);
    const boat = res.data;
    router.replace(`/boat/${boat.BID}?tab=service`);
  } catch (err) {
    if (err.response?.status === 401) {
      // Nie zalogowany → przekieruj do logowania
      const redirect = encodeURIComponent(`/qr/${qr}`);
      router.replace(`/login?redirect=${redirect}`);
    } else if (err.response?.status === 403) {
      router.replace("/unauthorized");
    } else {
      router.replace("/notfound");
    }
  }
});
</script>
